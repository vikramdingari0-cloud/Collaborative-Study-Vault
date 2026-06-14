// ============================================
// workspaceRoutes.js — Workspace API Endpoints
// ============================================
// Defines public and private HTTP routes for workspace actions.
// Wire-up logic: Route path → Authenticate → Validate → Execute
// ============================================

const express = require("express");
const router = express.Router();

// Controllers
const {
  getWorkspaces,
  createWorkspace,
  joinWorkspaceByCode,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} = require("../controllers/workspaceController");

// Validators
const {
  createWorkspaceRules,
  updateWorkspaceRules,
  joinWorkspaceRules,
  addMemberRules,
  updateMemberRoleRules,
  validate,
} = require("../validators/workspaceValidator");

// Auth Guard
const { protect } = require("../middleware/authMiddleware");

// Workspace Authorization Guards
const {
  requireWorkspaceMember,
  requireResourceOwnerOrAdmin,
} = require("../middleware/workspaceAuth");
const Workspace = require("../models/Workspace");

// All workspace routes require a valid JWT cookie session
router.use(protect);

// ============================================
// WORKSPACE MANAGEMENT ROUTES
// ============================================

// GET /api/v1/workspaces - Fetch all workspaces for the authenticated user
// POST /api/v1/workspaces - Create a new workspace
router
  .route("/")
  .get(getWorkspaces)
  .post(createWorkspaceRules, validate, createWorkspace);

// POST /api/v1/workspaces/join - Join a workspace using its short code
router.post("/join", joinWorkspaceRules, validate, joinWorkspaceByCode);

// GET /api/v1/workspaces/:id - Get details of a single workspace (must be member)
// PUT /api/v1/workspaces/:id - Update workspace details (owner/admin only)
// DELETE /api/v1/workspaces/:id - Delete a workspace (owner only)
router
  .route("/:id")
  .get(requireWorkspaceMember, getWorkspaceById)
  .put(requireWorkspaceMember, updateWorkspaceRules, validate, updateWorkspace)
  .delete(requireResourceOwnerOrAdmin(Workspace), deleteWorkspace);

// ============================================
// MEMBER MANAGEMENT ROUTES
// ============================================

// POST /api/v1/workspaces/:id/members - Invite a new member (must be member with admin role)
router
  .route("/:id/members")
  .post(requireWorkspaceMember, addMemberRules, validate, addWorkspaceMember);

// PUT /api/v1/workspaces/:id/members/:memberId - Update member role (must be member with admin role)
// DELETE /api/v1/workspaces/:id/members/:memberId - Remove member (must be member with admin role)
router
  .route("/:id/members/:memberId")
  .put(requireWorkspaceMember, updateMemberRoleRules, validate, updateWorkspaceMemberRole)
  .delete(requireWorkspaceMember, removeWorkspaceMember);

module.exports = router;
