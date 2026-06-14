// ============================================
// chatController.js — Chat Request Handlers
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const chatService = require("../services/chatService");

// @desc    Get chronological chat history for a workspace
// @route   GET /api/v1/chats/workspace/:workspaceId
// @access  Private
const getWorkspaceChatHistory = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { limit } = req.query;

  const messages = await chatService.getWorkspaceMessages(workspaceId, parseInt(limit, 10) || 50);
  apiResponse(res, 200, true, "Chat history retrieved successfully", messages);
});

// @desc    Send a new message to a workspace
// @route   POST /api/v1/chats/workspace/:workspaceId
// @access  Private
const sendChatMessage = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { message, type } = req.body;
  const senderId = req.user._id;

  if (!message) {
    return apiResponse(res, 400, false, "Message content is required");
  }

  const savedMessage = await chatService.createMessage({
    workspaceId,
    senderId,
    message,
    type,
  });

  apiResponse(res, 201, true, "Message sent successfully", savedMessage);
});

module.exports = {
  getWorkspaceChatHistory,
  sendChatMessage,
};
// ============================================
