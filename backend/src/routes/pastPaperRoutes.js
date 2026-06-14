const express = require("express");
const router = express.Router();
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB maximum size for past papers (PDFs can be large)
  },
});

const {
  createPastPaper,
  getWorkspacePastPapers,
  deletePastPaper,
} = require("../controllers/pastPaperController");

const { protect } = require("../middleware/authMiddleware");
const PastPaper = require("../models/PastPaper");
const {
  requireWorkspaceMember,
  requireWorkspaceMemberFromBody,
  requireResourceOwnerOrAdmin,
  requireEditorFromContext,
} = require("../middleware/workspaceAuth");

// Authenticate all routes
router.use(protect);

// Upload past paper
router.post(
  "/",
  upload.single("file"),
  requireWorkspaceMemberFromBody,
  requireEditorFromContext,
  createPastPaper
);

// Get workspace past papers
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspacePastPapers);

// Delete past paper (restrict to creator or admin)
router.delete("/:id", requireResourceOwnerOrAdmin(PastPaper), deletePastPaper);

module.exports = router;
