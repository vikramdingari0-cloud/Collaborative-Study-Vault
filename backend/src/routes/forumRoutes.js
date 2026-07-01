const express = require("express");
const router = express.Router();

const {
  createThread,
  getWorkspaceThreads,
  getThreadById,
  createReply,
  acceptReply,
  deleteThread,
} = require("../controllers/forumController");

const { protect } = require("../middleware/authMiddleware");
const ForumThread = require("../models/ForumThread");
const {
  requireWorkspaceMember,
  requireWorkspaceMemberFromBody,
  requireResourceWorkspaceMember,
} = require("../middleware/workspaceAuth");

const {
  createThreadRules,
  createReplyRules,
  validate,
} = require("../validators/domainValidator");

// Authenticate all routes
router.use(protect);

// Create thread
router.post("/", createThreadRules, validate, requireWorkspaceMemberFromBody, createThread);

// Get all threads for workspace
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspaceThreads);

// Get single thread
router.get("/thread/:id", requireResourceWorkspaceMember(ForumThread), getThreadById);

// Create reply to thread
router.post("/:id/replies", createReplyRules, validate, requireResourceWorkspaceMember(ForumThread), createReply);

// Accept reply as best answer (requires workspace membership since it's a sub-operation;
// the controller itself checks that the user is the thread author)
router.put(
  "/:id/replies/:replyId/accept",
  requireResourceWorkspaceMember(ForumThread),
  acceptReply
);

// Delete thread
router.delete("/:id", requireResourceWorkspaceMember(ForumThread), deleteThread);

module.exports = router;
