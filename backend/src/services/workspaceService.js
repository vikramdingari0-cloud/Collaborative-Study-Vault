// ============================================
// workspaceService.js — Workspace Business Logic
// ============================================
// Service layer that encapsulates database interactions,
// authorization controls, and recursive cleanup for workspaces.
// ============================================

const crypto = require("crypto");
const mongoose = require("mongoose");

const Workspace = require("../models/Workspace");
const User = require("../models/User");
const Folder = require("../models/Folder");
const Note = require("../models/Note");
const Chat = require("../models/Chat");
const Quiz = require("../models/Quiz");
const File = require("../models/File");
const PastPaper = require("../models/PastPaper");
const ForumThread = require("../models/ForumThread");
const Whiteboard = require("../models/Whiteboard");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const logger = require("../utils/logger");


const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a unique 6-character workspace join code
 */
const generateWorkspaceCode = async () => {
  for (let attempt = 0; attempt < 12; attempt++) {
    // Use crypto-secure random bytes instead of Math.random()
    const bytes = crypto.randomBytes(6);
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    }
    const exists = await Workspace.exists({ code });
    if (!exists) return code;
  }
  const error = new Error("Could not generate a unique workspace join code");
  error.statusCode = 500;
  throw error;
};

/**
 * Helper to check if user has a specific member role or is the owner
 * @param {Object} workspace - Workspace document
 * @param {string} userId - User ObjectId string
 * @param {Array<string>} allowedRoles - Roles allowed (e.g. ['admin', 'editor'])
 * @returns {boolean}
 */
const hasAccess = (workspace, userId, allowedRoles = []) => {
  if (!userId) return false;
  const userIdStr = userId.toString();
  
  // Safe helper to compare user/owner fields (handles populated objects or ObjectId)
  const matchesUser = (fieldVal) => {
    if (!fieldVal) return false;
    const id = fieldVal._id || fieldVal;
    return id.toString() === userIdStr;
  };

  // Owner always has full access
  if (matchesUser(workspace.owner)) {
    return true;
  }

  // Find member entry
  const member = workspace.members.find(m => matchesUser(m.user));
  if (!member) {
    return false;
  }

  // If no specific roles required, membership is enough
  if (allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(member.role);
};

/**
 * Create a new workspace
 * @param {Object} workspaceData - { title, description, ownerId, color, icon, visibility }
 * @returns {Object} Created workspace
 */
const createWorkspace = async ({ title, description, ownerId, color, icon, visibility, code }) => {
  const joinCode = code ? code.toUpperCase().trim() : await generateWorkspaceCode();

  // Create workspace with owner as the first member (admin role)
  const workspace = await Workspace.create({
    title,
    description,
    owner: ownerId,
    members: [{ user: ownerId, role: "admin" }],
    color,
    icon,
    visibility,
    code: joinCode,
  });

  // Push workspace ID to owner's workspaces list
  await User.findByIdAndUpdate(ownerId, {
    $addToSet: { workspaces: workspace._id }
  });

  return workspace;
};

/**
 * Get all workspaces accessible by a user
 * Uses lean() for performance and batch-populates owner in one pass
 * @param {string} userId - User ID
 * @returns {Array} List of workspaces
 */
const getWorkspacesForUser = async (userId) => {
  // Single query with populate (MongoDB $in handles both conditions efficiently)
  return await Workspace.find({
    $or: [
      { owner: userId },
      { "members.user": userId }
    ]
  })
    .populate("owner", "name email avatar")
    .populate("members.user", "name email avatar")
    .lean()
    .sort({ updatedAt: -1 });
};

/**
 * Get single workspace by ID (with authorization check)
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - Requesting User ID
 * @returns {Object} Workspace details
 */
const getWorkspaceById = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId)
    .populate("owner", "name email avatar")
    .populate("members.user", "name email avatar");

  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  // Verify membership
  if (!hasAccess(workspace, userId)) {
    const error = new Error("You do not have access to this workspace");
    error.statusCode = 403;
    throw error;
  }

  return workspace;
};

/**
 * Update workspace metadata (only owner or workspace admins)
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - Requesting User ID
 * @param {Object} updateData - Title, description, color, etc.
 * @returns {Object} Updated workspace
 */
const updateWorkspace = async (workspaceId, userId, updateData) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  // Only owner or admin members can update settings
  if (!hasAccess(workspace, userId, ["admin"])) {
    const error = new Error("Only owners or workspace admins can modify settings");
    error.statusCode = 403;
    throw error;
  }

  // Update fields
  const allowedUpdates = ["title", "description", "color", "icon", "visibility"];
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      workspace[field] = updateData[field];
    }
  });

  await workspace.save();
  return workspace;
};

/**
 * Delete workspace & perform recursive cleanup of ALL nested content atomically.
 * Uses a MongoDB session transaction to guarantee all-or-nothing consistency.
 * Cascade order:
 *   1. Files   → delete Cloudinary assets + File docs
 *   2. PastPapers → delete Cloudinary assets + PastPaper docs
 *   3. Folders, Notes, Chats, Quizzes, ForumThreads → delete docs
 *   4. Remove workspace ref from all user documents
 *   5. Delete the Workspace document itself
 *
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - Requesting User ID
 */
const deleteWorkspace = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  // ONLY the absolute owner can delete a workspace
  const ownerId = workspace.owner._id || workspace.owner;
  if (!ownerId || ownerId.toString() !== userId.toString()) {
    const error = new Error("Only the workspace owner can delete this workspace");
    error.statusCode = 403;
    throw error;
  }

  // ---- Cloudinary cleanup (outside transaction — external API calls) ----
  // Delete all workspace File assets from Cloudinary first
  if (isCloudinaryConfigured()) {
    const filesToDelete = await File.find({ workspace: workspaceId }).select("publicId fileType");
    for (const f of filesToDelete) {
      try {
        const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(f.fileType);
        await cloudinary.uploader.destroy(f.publicId, { resource_type: isImage ? "image" : "raw" });
      } catch (err) {
        logger.error(`Cloudinary cleanup failed for file ${f.publicId}: ${err.message}`);
      }
    }

    const papersToDelete = await PastPaper.find({ workspace: workspaceId }).select("publicId");
    for (const p of papersToDelete) {
      try {
        await cloudinary.uploader.destroy(p.publicId, { resource_type: "raw" });
      } catch (err) {
        logger.error(`Cloudinary cleanup failed for past paper ${p.publicId}: ${err.message}`);
      }
    }
  }

  // ---- Database deletion inside a transaction ----
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Delete all folders
      await Folder.deleteMany({ workspace: workspaceId }, { session });

      // 2. Delete all notes
      await Note.deleteMany({ workspace: workspaceId }, { session });

      // 3. Delete all chat messages
      await Chat.deleteMany({ workspace: workspaceId }, { session });

      // 4. Delete all quizzes
      await Quiz.deleteMany({ workspace: workspaceId }, { session });

      // 5. Delete all file metadata documents
      await File.deleteMany({ workspace: workspaceId }, { session });

      // 6. Delete all past paper metadata documents
      await PastPaper.deleteMany({ workspace: workspaceId }, { session });

      // 7. Delete all forum threads
      await ForumThread.deleteMany({ workspace: workspaceId }, { session });

      // 8. Delete whiteboard document
      await Whiteboard.deleteMany({ workspace: workspaceId }, { session });

      // 9. Remove workspace from all member users' workspaces arrays
      const memberIds = workspace.members
        .map((m) => (m.user ? m.user._id || m.user : null))
        .filter(Boolean);
      if (memberIds.length > 0) {
        await User.updateMany(
          { _id: { $in: memberIds } },
          { $pull: { workspaces: workspace._id } },
          { session }
        );
      }

      // 10. Delete the workspace document itself
      await Workspace.findByIdAndDelete(workspaceId, { session });
    });
  } finally {
    session.endSession();
  }
};

/**
 * Add a member to the workspace by email
 * @param {string} workspaceId - Workspace ID
 * @param {string} operatorId - Requesting User ID
 * @param {string} memberEmail - Email of user to add
 * @param {string} role - Role to assign (viewer, editor, admin)
 * @returns {Object} Updated workspace
 */
const addMemberToWorkspace = async (workspaceId, operatorId, memberEmail, role = "editor") => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  // Only owner or admin members can invite new members
  if (!hasAccess(workspace, operatorId, ["admin"])) {
    const error = new Error("Only owners or workspace admins can add members");
    error.statusCode = 403;
    throw error;
  }

  // Find user by email
  const userToAdd = await User.findOne({ email: memberEmail });
  if (!userToAdd) {
    const error = new Error(`User with email '${memberEmail}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // Check if already a member (handling populated objects or nulls)
  const alreadyMember = workspace.members.some((m) => {
    if (!m.user) return false;
    const memberId = m.user._id || m.user;
    return memberId.toString() === userToAdd._id.toString();
  });

  if (alreadyMember) {
    const error = new Error("User is already a member of this workspace");
    error.statusCode = 400;
    throw error;
  }

  // Add user to workspace members list
  workspace.members.push({ user: userToAdd._id, role });
  await workspace.save();

  // Add workspace ID to user's workspaces list
  await User.findByIdAndUpdate(userToAdd._id, {
    $addToSet: { workspaces: workspace._id }
  });

  return await Workspace.findById(workspaceId)
    .populate("owner", "name email avatar")
    .populate("members.user", "name email avatar");
};

/**
 * Join a workspace using its short join code
 * @param {string} code - Workspace join code
 * @param {string} userId - User joining
 * @returns {Object} Updated workspace
 */
const joinWorkspaceByCode = async (code, userId) => {
  const normalizedCode = code.trim().toUpperCase();
  const workspace = await Workspace.findOne({ code: normalizedCode });

  if (!workspace) {
    const error = new Error("Invalid workspace join code");
    error.statusCode = 404;
    throw error;
  }

  if (hasAccess(workspace, userId)) {
    const error = new Error("You are already a member of this workspace");
    error.statusCode = 400;
    throw error;
  }

  workspace.members.push({ user: userId, role: "editor" });
  await workspace.save();

  await User.findByIdAndUpdate(userId, {
    $addToSet: { workspaces: workspace._id },
  });

  return await Workspace.findById(workspace._id)
    .populate("owner", "name email avatar")
    .populate("members.user", "name email avatar");
};

/**
 * Update role of an existing member
 * @param {string} workspaceId - Workspace ID
 * @param {string} operatorId - Requesting User ID
 * @param {string} memberId - Member User ID to modify
 * @param {string} role - New role
 * @returns {Object} Updated workspace
 */
const updateMemberRole = async (workspaceId, operatorId, memberId, role) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  // Only owner or admin members can update roles
  if (!hasAccess(workspace, operatorId, ["admin"])) {
    const error = new Error("Only owners or workspace admins can update member roles");
    error.statusCode = 403;
    throw error;
  }

  // Find member (handling populated objects or nulls)
  const member = workspace.members.find((m) => {
    if (!m.user) return false;
    const id = m.user._id || m.user;
    return id.toString() === memberId.toString();
  });

  if (!member) {
    const error = new Error("Member not found in workspace");
    error.statusCode = 404;
    throw error;
  }

  // Prevent modifying the owner's role or operator demoting themselves (if they are the last admin)
  const ownerId = workspace.owner._id || workspace.owner;
  if (ownerId && ownerId.toString() === memberId.toString()) {
    const error = new Error("Cannot modify the workspace owner's role");
    error.statusCode = 400;
    throw error;
  }

  member.role = role;
  await workspace.save();

  return await Workspace.findById(workspaceId)
    .populate("owner", "name email avatar")
    .populate("members.user", "name email avatar");
};

/**
 * Remove a member from the workspace
 * @param {string} workspaceId - Workspace ID
 * @param {string} operatorId - Requesting User ID (can be admin OR the member themselves leaving)
 * @param {string} memberId - Member User ID to remove
 * @returns {Object} Updated workspace
 */
const removeMemberFromWorkspace = async (workspaceId, operatorId, memberId) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  const isSelfLeaving = operatorId.toString() === memberId.toString();

  // Allowed if operator is owner/admin OR user is leaving voluntarily
  if (!isSelfLeaving && !hasAccess(workspace, operatorId, ["admin"])) {
    const error = new Error("Only owners or workspace admins can remove members");
    error.statusCode = 403;
    throw error;
  }

  // Prevent removing the owner
  const ownerId = workspace.owner._id || workspace.owner;
  if (ownerId && ownerId.toString() === memberId.toString()) {
    const error = new Error("Cannot remove the owner of the workspace");
    error.statusCode = 400;
    throw error;
  }

  // Check if member actually exists in workspace (handling populated objects or nulls)
  const memberIndex = workspace.members.findIndex((m) => {
    if (!m.user) return false;
    const id = m.user._id || m.user;
    return id.toString() === memberId.toString();
  });

  if (memberIndex === -1) {
    const error = new Error("User is not a member of this workspace");
    error.statusCode = 404;
    throw error;
  }

  // Remove member
  workspace.members.splice(memberIndex, 1);
  await workspace.save();

  // Pull workspace ID from removed user's workspaces list
  await User.findByIdAndUpdate(memberId, {
    $pull: { workspaces: workspace._id }
  });

  return await Workspace.findById(workspaceId)
    .populate("owner", "name email avatar")
    .populate("members.user", "name email avatar");
};

module.exports = {
  createWorkspace,
  getWorkspacesForUser,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMemberToWorkspace,
  joinWorkspaceByCode,
  updateMemberRole,
  removeMemberFromWorkspace,
};
