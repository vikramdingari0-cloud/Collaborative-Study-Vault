// ============================================
// fileController.js — File Request Handlers
// ============================================
// Controller layer for managing student uploaded files.
// Links express HTTP routes to fileService business logic.
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const fileService = require("../services/fileService");

// @desc    Upload a new file
// @route   POST /api/v1/files
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
  const { workspaceId, folderId } = req.body;

  if (!workspaceId) {
    return apiResponse(res, 400, false, "workspaceId is required");
  }

  const fileDoc = await fileService.uploadFile({
    file: req.file,
    workspaceId,
    folderId,
    userId: req.user._id,
  });

  apiResponse(res, 201, true, "File uploaded successfully", fileDoc);
});

// @desc    Get all files in a workspace (optional folder filter)
// @route   GET /api/v1/files/workspace/:workspaceId
// @access  Private
const getWorkspaceFiles = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { folderId } = req.query; // can be 'root' or a specific folder ID

  const files = await fileService.getFilesForWorkspace(workspaceId, folderId || null);

  apiResponse(res, 200, true, "Files retrieved successfully", files);
});

// @desc    Delete a file
// @route   DELETE /api/v1/files/:id
// @access  Private
const deleteFile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await fileService.deleteFile(id);

  apiResponse(res, 200, true, "File deleted successfully");
});

module.exports = {
  uploadFile,
  getWorkspaceFiles,
  deleteFile,
};
