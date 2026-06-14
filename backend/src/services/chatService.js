// ============================================
// chatService.js — Group Chat Business Logic
// ============================================

const Chat = require("../models/Chat");

/**
 * Get chronological chat history for a workspace study group
 * @param {string} workspaceId - Workspace ID
 * @param {number} limit - Number of messages to retrieve
 * @returns {Array} List of messages
 */
const getWorkspaceMessages = async (workspaceId, limit = 50, before = null) => {
  const query = { workspace: workspaceId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  return await Chat.find(query)
    .populate("sender", "name email avatar")
    .sort({ createdAt: 1 }) // Chronological order
    .limit(Math.min(limit, 100)); // Cap at 100 messages per request
};

/**
 * Create a new message in a workspace study group
 * @param {Object} messageData - { workspaceId, senderId, message, type }
 * @returns {Object} Saved message
 */
const createMessage = async ({ workspaceId, senderId, message, type = "text" }) => {
  const newMessage = await Chat.create({
    workspace: workspaceId,
    sender: senderId,
    message,
    type,
  });

  return await Chat.findById(newMessage._id).populate("sender", "name email avatar");
};

module.exports = {
  getWorkspaceMessages,
  createMessage,
};
