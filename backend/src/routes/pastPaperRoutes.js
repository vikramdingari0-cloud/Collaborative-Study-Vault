const express = require("express");
const router = express.Router();
const multer = require("multer");

// Past papers are PDFs only — strictly enforce this.
const PDF_ONLY_FILTER = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error("Only PDF files are accepted for past papers."), { statusCode: 400 }),
      false
    );
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: PDF_ONLY_FILTER,
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

const {
  createPastPaperRules,
  validate,
} = require("../validators/domainValidator");

// Authenticate all routes
router.use(protect);

// Upload past paper
router.post(
  "/",
  upload.single("file"),
  createPastPaperRules,
  validate,
  requireWorkspaceMemberFromBody,
  requireEditorFromContext,
  createPastPaper
);

// Get workspace past papers
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspacePastPapers);

// Delete past paper (restrict to creator or admin)
router.delete("/:id", requireResourceOwnerOrAdmin(PastPaper), deletePastPaper);

module.exports = router;
