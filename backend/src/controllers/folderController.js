// ============================================
// folderController.js — Folder Request Handlers
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const folderService = require("../services/folderService");

// @desc    Create a new folder in a workspace
// @route   POST /api/v1/folders
// @access  Private
const createFolder = asyncHandler(async (req, res) => {
  const { name, workspaceId, parentFolder, color, icon } = req.body;
  const userId = req.user._id;

  if (!name || !workspaceId) {
    return apiResponse(res, 400, false, "Folder name and workspaceId are required");
  }

  const folder = await folderService.createFolder({
    name,
    workspaceId,
    parentFolder: parentFolder || null,
    userId,
    color,
    icon,
  });

  apiResponse(res, 201, true, "Folder created successfully", folder);
});

// @desc    Get all folders for a workspace
// @route   GET /api/v1/folders/workspace/:workspaceId
// @access  Private
const getWorkspaceFolders = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  
  const folders = await folderService.getFoldersForWorkspace(workspaceId);
  apiResponse(res, 200, true, "Folders retrieved successfully", folders);
});

// @desc    Update folder details
// @route   PUT /api/v1/folders/:id
// @access  Private
const updateFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const folder = await folderService.updateFolder(id, userId, req.body);
  apiResponse(res, 200, true, "Folder updated successfully", folder);
});

// @desc    Delete folder recursively
// @route   DELETE /api/v1/folders/:id
// @access  Private
const deleteFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  await folderService.deleteFolder(id, userId);
  apiResponse(res, 200, true, "Folder and all nested content deleted recursively");
});

module.exports = {
  createFolder,
  getWorkspaceFolders,
  updateFolder,
  deleteFolder,
};
