// ============================================
// workspaceController.js — Workspace Request Handlers
// ============================================
// Controller layer linking endpoints to workspaceService.
// Standardizes API envelopes using asyncHandler and apiResponse utilities.
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const workspaceService = require("../services/workspaceService");

// ============================================
// @desc    Get all workspaces for current user
// @route   GET /api/v1/workspaces
// @access  Private
// ============================================
const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.getWorkspacesForUser(req.user._id);
  apiResponse(res, 200, true, "Workspaces retrieved successfully", workspaces);
});

// ============================================
// @desc    Create a new workspace
// @route   POST /api/v1/workspaces
// @access  Private
// ============================================
const createWorkspace = asyncHandler(async (req, res) => {
  const { title, description, color, icon, visibility } = req.body;
  const ownerId = req.user._id;

  const workspace = await workspaceService.createWorkspace({
    title,
    description,
    ownerId,
    color,
    icon,
    visibility,
  });

  apiResponse(res, 201, true, "Workspace created successfully", workspace);
});

// ============================================
// @desc    Get workspace by ID
// @route   GET /api/v1/workspaces/:id
// @access  Private
// ============================================
const getWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
  apiResponse(res, 200, true, "Workspace details retrieved", workspace);
});

// ============================================
// @desc    Update workspace metadata
// @route   PUT /api/v1/workspaces/:id
// @access  Private
// ============================================
const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(
    req.params.id,
    req.user._id,
    req.body
  );
  apiResponse(res, 200, true, "Workspace updated successfully", workspace);
});

// ============================================
// @desc    Delete workspace and clean up
// @route   DELETE /api/v1/workspaces/:id
// @access  Private
// ============================================
const deleteWorkspace = asyncHandler(async (req, res) => {
  await workspaceService.deleteWorkspace(req.params.id, req.user._id);
  apiResponse(res, 200, true, "Workspace deleted successfully along with all nested contents");
});

// ============================================
// @desc    Join workspace by short join code
// @route   POST /api/v1/workspaces/join
// @access  Private
// ============================================
const joinWorkspaceByCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const workspace = await workspaceService.joinWorkspaceByCode(code, req.user._id);
  apiResponse(res, 200, true, "Joined workspace successfully", workspace);
});

// ============================================
// @desc    Add member to workspace by email
// @route   POST /api/v1/workspaces/:id/members
// @access  Private
// ============================================
const addWorkspaceMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const workspace = await workspaceService.addMemberToWorkspace(
    req.params.id,
    req.user._id,
    email,
    role
  );
  apiResponse(res, 200, true, "Member added successfully", workspace);
});

// ============================================
// @desc    Update workspace member role
// @route   PUT /api/v1/workspaces/:id/members/:memberId
// @access  Private
// ============================================
const updateWorkspaceMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const workspace = await workspaceService.updateMemberRole(
    req.params.id,
    req.user._id,
    req.params.memberId,
    role
  );
  apiResponse(res, 200, true, "Member role updated successfully", workspace);
});

// ============================================
// @desc    Remove workspace member or leave workspace
// @route   DELETE /api/v1/workspaces/:id/members/:memberId
// @access  Private
// ============================================
const removeWorkspaceMember = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.removeMemberFromWorkspace(
    req.params.id,
    req.user._id,
    req.params.memberId
  );
  apiResponse(res, 200, true, "Member removed from workspace successfully", workspace);
});

module.exports = {
  getWorkspaces,
  createWorkspace,
  joinWorkspaceByCode,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
};
