// ============================================
// fileRoutes.js — File API Endpoints
// ============================================

const express = require("express");
const router = express.Router();
const multer = require("multer");

// ---- Allowed MIME types whitelist ----
// Only permit safe, document/image/audio types.
// Executables, HTML, SVG-with-scripts, and scripts are BLOCKED.
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
  "text/csv",
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error(`File type '${file.mimetype}' is not allowed. Permitted: images, PDF, Word, Excel, PowerPoint, plain text.`), { statusCode: 400 }),
      false
    );
  }
};

// Configure multer memory storage (stores file in memory buffer, ready for Cloudinary streaming)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter,
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

const {
  uploadFileRules,
  validate,
} = require("../validators/domainValidator");

// Protect all file endpoints
router.use(protect);

// POST /api/v1/files — Upload a file (workspaceId in body)
router.post(
  "/",
  upload.single("file"),
  uploadFileRules,
  validate,
  requireWorkspaceMemberFromBody,
  requireEditorFromContext,
  uploadFile
);

// GET /api/v1/files/workspace/:workspaceId — List workspace files
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspaceFiles);

// DELETE /api/v1/files/:id — Delete a file (creator or workspace admin)
router.delete("/:id", requireResourceOwnerOrAdmin(File), deleteFile);

module.exports = router;
