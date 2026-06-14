// ============================================
// fileRoutes.js — File API Endpoints
// ============================================

const express = require("express");
const router = express.Router();
const multer = require("multer");

// Configure multer memory storage (stores file in memory buffer, ready for Cloudinary streaming)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum file size limit
  },
});

const {
  uploadFile,
  getWorkspaceFiles,
  deleteFile,
} = require("../controllers/fileController");

const { protect } = require("../middleware/authMiddleware");
const File = require("../models/File");
const {
  requireWorkspaceMember,
  requireWorkspaceMemberFromBody,
  requireResourceWorkspaceMember,
  requireResourceOwnerOrAdmin,
  requireEditorFromContext,
} = require("../middleware/workspaceAuth");

// Protect all file endpoints
router.use(protect);

// POST /api/v1/files — Upload a file (workspaceId in body)
router.post(
  "/",
  upload.single("file"),
  requireWorkspaceMemberFromBody,
  requireEditorFromContext,
  uploadFile
);

// GET /api/v1/files/workspace/:workspaceId — List workspace files
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspaceFiles);

// DELETE /api/v1/files/:id — Delete a file (creator or workspace admin)
router.delete("/:id", requireResourceOwnerOrAdmin(File), deleteFile);

module.exports = router;
