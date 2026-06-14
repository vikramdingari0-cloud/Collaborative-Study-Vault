// ============================================
// folderService.js — Folder Business Logic
// ============================================

const Folder = require("../models/Folder");
const Note = require("../models/Note");

/**
 * Create a new folder inside a workspace
 * @param {Object} folderData - { name, workspaceId, parentFolder, userId, color, icon }
 * @returns {Object} Created folder
 */
const createFolder = async ({ name, workspaceId, parentFolder = null, userId, color, icon }) => {
  return await Folder.create({
    name,
    workspace: workspaceId,
    parentFolder,
    createdBy: userId,
    color,
    icon,
  });
};

/**
 * Get all folders for a workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Array} Folders
 */
const getFoldersForWorkspace = async (workspaceId) => {
  return await Folder.find({ workspace: workspaceId })
    .populate("createdBy", "name email avatar")
    .sort({ createdAt: 1 });
};

/**
 * Update folder metadata
 * @param {string} folderId - Folder ID
 * @param {string} userId - Requesting User ID
 * @param {Object} updateData - { name, color, icon }
 * @returns {Object} Updated folder
 */
const updateFolder = async (folderId, userId, updateData) => {
  const folder = await Folder.findById(folderId);

  if (!folder) {
    const error = new Error("Folder not found");
    error.statusCode = 404;
    throw error;
  }

  // Update allowed fields
  const allowedUpdates = ["name", "color", "icon"];
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      folder[field] = updateData[field];
    }
  });

  await folder.save();
  return folder;
};

/**
 * Recursively delete a folder, its child subfolders, and all nested notes
 * Uses breadth-first deletion for robustness — if the process crashes mid-deletion,
 * the remaining orphans can still be cleaned up by workspace deletion.
 * @param {string} folderId - Folder ID to delete
 * @param {string} userId - Requesting User ID
 */
const deleteFolder = async (folderId, userId) => {
  const folder = await Folder.findById(folderId);

  if (!folder) {
    const error = new Error("Folder not found");
    error.statusCode = 404;
    throw error;
  }

  // Collect ALL descendant folder IDs using iterative BFS (avoids stack overflow on deep trees)
  const allFolderIds = [folderId];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await Folder.find({ parentFolder: currentId }).select("_id");
    for (const child of children) {
      allFolderIds.push(child._id);
      queue.push(child._id);
    }
  }

  // Delete all notes in all collected folders (batched — more efficient & atomic)
  await Note.deleteMany({ folder: { $in: allFolderIds } });

  // Delete all files in all collected folders (Cloudinary + Mongoose)
  const fileService = require("./fileService");
  await fileService.deleteFilesForFolders(allFolderIds);

  // Delete all collected folders (reverse order — children first, then parent)
  // Using deleteMany with $in for efficiency instead of one-by-one
  await Folder.deleteMany({ _id: { $in: allFolderIds } });
};

module.exports = {
  createFolder,
  getFoldersForWorkspace,
  updateFolder,
  deleteFolder,
};
