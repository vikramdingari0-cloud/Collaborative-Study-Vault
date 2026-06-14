// ============================================
// folderRoutes.js — Folder API Endpoints
// ============================================

const express = require("express");
const router = express.Router();

const {
  createFolder,
  getWorkspaceFolders,
  updateFolder,
  deleteFolder,
} = require("../controllers/folderController");

const { protect } = require("../middleware/authMiddleware");
const Folder = require("../models/Folder");
const {
  requireWorkspaceMember,
  requireWorkspaceMemberFromBody,
  requireResourceWorkspaceMember,
  requireResourceOwnerOrAdmin,
  requireEditorFromContext,
} = require("../middleware/workspaceAuth");

// Secure all endpoints with protect guard
router.use(protect);

// POST /api/v1/folders — Create folder (workspaceId in body)
router.post("/", requireWorkspaceMemberFromBody, createFolder);

// GET /api/v1/folders/workspace/:workspaceId — List folders
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspaceFolders);

// PUT /api/v1/folders/:id — Update folder
router.put("/:id", requireResourceWorkspaceMember(Folder), requireEditorFromContext, updateFolder);

// DELETE /api/v1/folders/:id — Delete folder (owner or admin only)
router.delete("/:id", requireResourceOwnerOrAdmin(Folder), deleteFolder);

module.exports = router;
