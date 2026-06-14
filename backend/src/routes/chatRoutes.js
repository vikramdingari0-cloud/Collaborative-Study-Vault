// ============================================
// chatRoutes.js — Group Chat API Endpoints
// ============================================

const express = require("express");
const router = express.Router();

const {
  getWorkspaceChatHistory,
  sendChatMessage,
} = require("../controllers/chatController");

const { protect } = require("../middleware/authMiddleware");
const { requireWorkspaceMember, requireEditorFromContext } = require("../middleware/workspaceAuth");

// Secure all endpoints with protect guard
router.use(protect);

// GET /api/v1/chats/workspace/:workspaceId — Chat history
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspaceChatHistory);

// POST /api/v1/chats/workspace/:workspaceId — Send message
router.post("/workspace/:workspaceId", requireWorkspaceMember, requireEditorFromContext, sendChatMessage);

module.exports = router;
