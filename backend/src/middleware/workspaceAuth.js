// ============================================
// workspaceAuth.js — Workspace Authorization Middleware
// ============================================
// Verifies that the authenticated user is a member of the workspace
// associated with the requested resource. Prevents unauthorized access
// to notes, folders, chats, quizzes, and AI features in workspaces
// the user does not belong to.
//
// THREE CHECK MODES:
// 1. requireWorkspaceMember       — workspaceId in req.params
// 2. requireWorkspaceMemberFromBody — workspaceId in req.body
// 3. requireResourceWorkspaceMember — look up workspace from the resource document
// 4. requireResourceOwnerOrAdmin   — resource owner or workspace admin
// ============================================

const Workspace = require("../models/Workspace");
const logger = require("../utils/logger");

/**
 * Check if a user is a member (or owner) of a workspace
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {Object} { isMember, workspace, memberRole }
 */
const checkMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { isMember: false, workspace: null, memberRole: null, notFound: true };
  }

  // Owner always has access
  const ownerId = workspace.owner._id ? workspace.owner._id.toString() : workspace.owner.toString();
  if (ownerId === userId.toString()) {
    return { isMember: true, workspace, memberRole: "owner" };
  }

  // Check members array
  const member = workspace.members.find((m) => {
    if (!m.user) return false;
    const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberId === userId.toString();
  });

  if (member) {
    return { isMember: true, workspace, memberRole: member.role };
  }

  return { isMember: false, workspace, memberRole: null };
};

/**
 * Middleware: Require workspace membership where workspaceId is in req.params
 * Supports both :workspaceId and :id param names (workspace routes use :id)
 * e.g. GET /api/v1/notes/workspace/:workspaceId  OR  GET /api/v1/workspaces/:id
 */
const requireWorkspaceMember = async (req, res, next) => {
  try {
    // Support both :workspaceId and :id parameter names
    const workspaceId = req.params.workspaceId || req.params.id;
    const userId = req.user?._id;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId parameter is required" });
    }

    const { isMember, workspace, notFound, memberRole } = await checkMembership(workspaceId, userId);

    if (notFound) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    if (!isMember) {
      logger.warn(`Authorization denied: User ${userId} attempted to access workspace ${workspaceId} without membership`);
      return res.status(403).json({ success: false, message: "You do not have access to this workspace" });
    }

    // Attach workspace and role for downstream use
    req.workspace = workspace;
    req.memberRole = memberRole;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Require workspace membership where workspaceId is in req.body
 * e.g. POST /api/v1/notes { workspaceId: "...", title: "..." }
 */
const requireWorkspaceMemberFromBody = async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    const userId = req.user._id;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId is required in request body" });
    }

    const { isMember, workspace, notFound, memberRole } = await checkMembership(workspaceId, userId);

    if (notFound) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    if (!isMember) {
      logger.warn(`Authorization denied: User ${userId} attempted to access workspace ${workspaceId} without membership`);
      return res.status(403).json({ success: false, message: "You do not have access to this workspace" });
    }

    req.workspace = workspace;
    req.memberRole = memberRole;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware factory: Look up workspace from a resource document
 * The resource model must have a `workspace` field referencing Workspace.
 *
 * @param {Object} Model - Mongoose model (Note, Folder, Quiz, etc.)
 * @param {string} [idField="id"] - The req.params field containing the resource ID
 * @param {string} [bodyField] - If set, look up resource ID from req.body instead of params
 */
const requireResourceWorkspaceMember = (Model, idField = "id", bodyField = null) => {
  return async (req, res, next) => {
    try {
      const resourceId = bodyField ? req.body[bodyField] : req.params[idField];
      const userId = req.user._id;

      if (!resourceId) {
        return res.status(400).json({ success: false, message: `Resource ID (${idField}) is required` });
      }

      // Look up the resource to find its workspace
      const resource = await Model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ success: false, message: `${Model.modelName} not found` });
      }

      const workspaceId = resource.workspace;
      const { isMember, workspace, notFound, memberRole } = await checkMembership(workspaceId, userId);

      if (notFound) {
        return res.status(404).json({ success: false, message: "Workspace not found" });
      }

      if (!isMember) {
        logger.warn(`Authorization denied: User ${userId} attempted to access ${Model.modelName} ${resourceId} in workspace ${workspaceId} without membership`);
        return res.status(403).json({ success: false, message: "You do not have access to this resource" });
      }

      // Attach resource, workspace, and role for downstream use
      req.resource = resource;
      req.workspace = workspace;
      req.memberRole = memberRole;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware factory: Require that the user is the resource owner OR a workspace admin
 * Used for DELETE operations on notes, folders, quizzes
 *
 * @param {Object} Model - Mongoose model with a `createdBy` field
 */
const requireResourceOwnerOrAdmin = (Model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user._id;

      if (!resourceId) {
        return res.status(400).json({ success: false, message: "Resource ID is required" });
      }

      // Look up the resource
      const resource = await Model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ success: false, message: `${Model.modelName} not found` });
      }

      // Special case: if the resource IS a Workspace, the workspaceId is the resource itself
      const workspaceId = resource.workspace || resource._id;
      const { isMember, workspace, notFound, memberRole } = await checkMembership(workspaceId, userId);

      if (notFound) {
        return res.status(404).json({ success: false, message: "Workspace not found" });
      }

      if (!isMember) {
        logger.warn(`Authorization denied: User ${userId} attempted to delete ${Model.modelName} ${resourceId} without workspace membership`);
        return res.status(403).json({ success: false, message: "You do not have access to this resource" });
      }

      // Check if user is the resource creator OR workspace owner/admin
      // For Workspace model, check the `owner` field; for others, check `createdBy`
      let createdById;
      if (resource.owner) {
        createdById = resource.owner._id ? resource.owner._id.toString() : resource.owner.toString();
      } else if (resource.createdBy) {
        createdById = resource.createdBy._id ? resource.createdBy._id.toString() : resource.createdBy.toString();
      } else {
        createdById = null;
      }
      const isOwner = createdById && createdById === userId.toString();
      const isWorkspaceAdmin = memberRole === "owner" || memberRole === "admin";

      if (!isOwner && !isWorkspaceAdmin) {
        logger.warn(`Authorization denied: User ${userId} is not owner/admin of ${Model.modelName} ${resourceId}`);
        return res.status(403).json({ success: false, message: "Only the resource creator or a workspace admin can perform this action" });
      }

      req.resource = resource;
      req.workspace = workspace;
      req.memberRole = memberRole;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware: Require editor, admin, or owner role (blocks viewers from mutations)
 */
const requireWorkspaceEditor = (req, res, next) => {
  const role = req.memberRole;
  if (role === "viewer") {
    return res.status(403).json({
      success: false,
      message: "Viewers have read-only access in this workspace",
    });
  }
  next();
};

/**
 * Chain after requireWorkspaceMember / requireResourceWorkspaceMember
 */
const requireEditorFromContext = (req, res, next) => {
  if (req.memberRole === "viewer") {
    return res.status(403).json({
      success: false,
      message: "Viewers have read-only access in this workspace",
    });
  }
  next();
};

module.exports = {
  checkMembership,
  requireWorkspaceMember,
  requireWorkspaceMemberFromBody,
  requireResourceWorkspaceMember,
  requireResourceOwnerOrAdmin,
  requireWorkspaceEditor,
  requireEditorFromContext,
};
