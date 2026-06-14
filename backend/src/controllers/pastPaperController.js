const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const pastPaperService = require("../services/pastPaperService");

// @desc    Upload a past paper
// @route   POST /api/v1/pastpapers
// @access  Private (Workspace member with edit access)
const createPastPaper = asyncHandler(async (req, res) => {
  const { title, subject, year, workspaceId } = req.body;
  const file = req.file;
  const userId = req.user._id;

  if (!title || !subject || !year || !workspaceId) {
    return apiResponse(res, 400, false, "All fields (title, subject, year, workspaceId) are required");
  }

  const pastPaper = await pastPaperService.uploadPastPaper({
    file,
    title,
    subject,
    year,
    workspaceId,
    userId,
  });

  apiResponse(res, 201, true, "Past paper uploaded successfully", pastPaper);
});

// @desc    Get all past papers for a workspace
// @route   GET /api/v1/pastpapers/workspace/:workspaceId
// @access  Private (Workspace member)
const getWorkspacePastPapers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const pastPapers = await pastPaperService.getPastPapersForWorkspace(workspaceId);
  apiResponse(res, 200, true, "Past papers retrieved successfully", pastPapers);
});

// @desc    Delete a past paper
// @route   DELETE /api/v1/pastpapers/:id
// @access  Private (Workspace member with edit access)
const deletePastPaper = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await pastPaperService.deletePastPaper(id);
  apiResponse(res, 200, true, "Past paper deleted successfully");
});

module.exports = {
  createPastPaper,
  getWorkspacePastPapers,
  deletePastPaper,
};
