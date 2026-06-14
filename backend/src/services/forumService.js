const ForumThread = require("../models/ForumThread");

/**
 * Create a new Q&A discussion thread
 * @param {Object} threadData - { title, content, workspaceId, userId }
 * @returns {Object} Created thread
 */
const createThread = async ({ title, content, workspaceId, userId }) => {
  if (!title || !content || !workspaceId) {
    const error = new Error("Title, content, and workspaceId are required");
    error.statusCode = 400;
    throw error;
  }

  const thread = await ForumThread.create({
    title,
    content,
    workspace: workspaceId,
    author: userId,
    replies: [],
  });

  return await ForumThread.findById(thread._id)
    .populate("author", "name email avatar");
};

/**
 * Get all threads for a workspace
 * @param {string} workspaceId
 * @returns {Array} List of threads
 */
const getThreadsForWorkspace = async (workspaceId) => {
  return await ForumThread.find({ workspace: workspaceId })
    .populate("author", "name email avatar")
    .populate("replies.author", "name email avatar")
    .sort({ createdAt: -1 });
};

/**
 * Get a single thread details
 * @param {string} threadId
 * @returns {Object} Thread with replies
 */
const getThreadById = async (threadId) => {
  const thread = await ForumThread.findById(threadId)
    .populate("author", "name email avatar")
    .populate("replies.author", "name email avatar");

  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }

  return thread;
};

/**
 * Add a reply to a thread
 * @param {string} threadId
 * @param {string} userId
 * @param {string} content
 * @returns {Object} Updated thread
 */
const addReply = async (threadId, userId, content) => {
  if (!content) {
    const error = new Error("Reply content is required");
    error.statusCode = 400;
    throw error;
  }

  const thread = await ForumThread.findById(threadId);
  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }

  // Push the reply
  thread.replies.push({
    author: userId,
    content,
    isAccepted: false,
  });

  await thread.save();

  // Return full thread populated
  return await getThreadById(threadId);
};

/**
 * Accept a specific reply as the best answer
 * @param {string} threadId
 * @param {string} userId - User requesting (must be thread author)
 * @param {string} replyId
 * @returns {Object} Updated thread
 */
const acceptReply = async (threadId, userId, replyId) => {
  const thread = await ForumThread.findById(threadId);
  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }

  // Verify authorization: only the thread author can accept replies
  if (thread.author.toString() !== userId.toString()) {
    const error = new Error("Only the thread author can accept replies");
    error.statusCode = 403;
    throw error;
  }

  // Update replies
  let found = false;
  thread.replies.forEach((r) => {
    if (r._id.toString() === replyId.toString()) {
      r.isAccepted = true;
      found = true;
    } else {
      r.isAccepted = false; // Reset others
    }
  });

  if (!found) {
    const error = new Error("Reply not found in thread");
    error.statusCode = 404;
    throw error;
  }

  thread.isResolved = true;
  await thread.save();

  return await getThreadById(threadId);
};

/**
 * Delete a thread
 * @param {string} threadId
 * @param {string} userId - User requesting deletion
 * @param {string} userRole - Workspace member role (owner/admin get bypass)
 */
const deleteThread = async (threadId, userId, userRole) => {
  const thread = await ForumThread.findById(threadId);
  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }

  const isAuthor = thread.author.toString() === userId.toString();
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  if (!isAuthor && !isAdminOrOwner) {
    const error = new Error("Unauthorized to delete this thread");
    error.statusCode = 403;
    throw error;
  }

  await ForumThread.findByIdAndDelete(threadId);
};

module.exports = {
  createThread,
  getThreadsForWorkspace,
  getThreadById,
  addReply,
  acceptReply,
  deleteThread,
};
