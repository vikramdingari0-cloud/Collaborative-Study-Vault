const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const forumService = require("../services/forumService");

// @desc    Create a Q&A thread
// @route   POST /api/v1/forum
// @access  Private (Workspace member)
const createThread = asyncHandler(async (req, res) => {
  const { title, content, workspaceId } = req.body;
  const userId = req.user._id;

  const thread = await forumService.createThread({
    title,
    content,
    workspaceId,
    userId,
  });

  apiResponse(res, 201, true, "Thread created successfully", thread);
});

// @desc    Get all threads for a workspace
// @route   GET /api/v1/forum/workspace/:workspaceId
// @access  Private (Workspace member)
const getWorkspaceThreads = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const threads = await forumService.getThreadsForWorkspace(workspaceId);
  apiResponse(res, 200, true, "Threads retrieved successfully", threads);
});

// @desc    Get details of a single thread
// @route   GET /api/v1/forum/thread/:id
// @access  Private (Workspace member)
const getThreadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const thread = await forumService.getThreadById(id);
  apiResponse(res, 200, true, "Thread retrieved successfully", thread);
});

// @desc    Post a reply to a thread
// @route   POST /api/v1/forum/:id/replies
// @access  Private (Workspace member)
const createReply = asyncHandler(async (req, res) => {
  const { id: threadId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  const thread = await forumService.addReply(threadId, userId, content);
  apiResponse(res, 201, true, "Reply posted successfully", thread);
});

// @desc    Accept a reply as best answer
// @route   PUT /api/v1/forum/:id/replies/:replyId/accept
// @access  Private (Workspace member - Thread author only)
const acceptReply = asyncHandler(async (req, res) => {
  const { id: threadId, replyId } = req.params;
  const userId = req.user._id;

  const thread = await forumService.acceptReply(threadId, userId, replyId);
  apiResponse(res, 200, true, "Reply accepted as best answer", thread);
});

// @desc    Delete a thread
// @route   DELETE /api/v1/forum/:id
// @access  Private (Workspace member - Thread author or Workspace admin)
const deleteThread = asyncHandler(async (req, res) => {
  const { id: threadId } = req.params;
  const userId = req.user._id;
  const userRole = req.memberRole; // Injected by requireWorkspaceMember middleware

  await forumService.deleteThread(threadId, userId, userRole);
  apiResponse(res, 200, true, "Thread deleted successfully");
});

module.exports = {
  createThread,
  getWorkspaceThreads,
  getThreadById,
  createReply,
  acceptReply,
  deleteThread,
};
