// ============================================
// aiRoutes.js — AI API Endpoints
// ============================================
// Secured Express routes mapping AI controller handlers to URL segments.
// All requests are run through the JWT authorization protect guard
// and workspace membership verification.
// ============================================

const express = require("express");
const router = express.Router();

const { summarizeNote, explainConcept, generateFlashcards, analyzeWhiteboard } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");
const Note = require("../models/Note");
const {
  requireResourceWorkspaceMember,
  requireEditorFromContext,
} = require("../middleware/workspaceAuth");

// Secure all endpoints with protect guard
router.use(protect);

// POST /api/v1/ai/summarize -> Summarize note content
router.post(
  "/summarize",
  requireResourceWorkspaceMember(Note, "noteId", "noteId"),
  requireEditorFromContext,
  summarizeNote
);

router.post(
  "/explain",
  requireResourceWorkspaceMember(Note, "noteId", "noteId"),
  requireEditorFromContext,
  explainConcept
);

router.post(
  "/flashcards",
  requireResourceWorkspaceMember(Note, "noteId", "noteId"),
  requireEditorFromContext,
  generateFlashcards
);

router.post(
  "/analyze-image",
  analyzeWhiteboard
);

module.exports = router;
