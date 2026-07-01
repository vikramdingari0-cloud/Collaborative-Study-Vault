// ============================================
// quizRoutes.js — Quiz API Endpoints
// ============================================
// Express routes managing active recall study quizzes. All routes are
// protected by JWT guard and workspace membership verification.
// ============================================

const express = require("express");
const router = express.Router();

const {
  generateQuiz,
  getWorkspaceQuizzes,
  getQuizById,
  submitAttempt,
  deleteQuiz,
} = require("../controllers/quizController");

const { protect } = require("../middleware/authMiddleware");
const Quiz = require("../models/Quiz");
const Note = require("../models/Note");
const {
  requireWorkspaceMember,
  requireResourceWorkspaceMember,
  requireResourceOwnerOrAdmin,
  requireEditorFromContext,
} = require("../middleware/workspaceAuth");

const {
  generateQuizRules,
  submitAttemptRules,
  validate,
} = require("../validators/domainValidator");

// Require JWT auth token session
router.use(protect);

// POST /api/v1/quizzes/generate -> Trigger generation of a new quiz
router.post(
  "/generate",
  generateQuizRules,
  validate,
  requireResourceWorkspaceMember(Note, "noteId", "noteId"),
  requireEditorFromContext,
  generateQuiz
);

// GET /api/v1/quizzes/workspace/:workspaceId -> Get all quizzes in a workspace
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspaceQuizzes);

// GET /api/v1/quizzes/:id -> Get details of a single quiz
router.get("/:id", requireResourceWorkspaceMember(Quiz), getQuizById);

// POST /api/v1/quizzes/:id/attempt -> Submit a score attempt
router.post(
  "/:id/attempt",
  submitAttemptRules,
  validate,
  requireResourceWorkspaceMember(Quiz),
  requireEditorFromContext,
  submitAttempt
);

// DELETE /api/v1/quizzes/:id -> Delete a quiz (owner or admin)
router.delete("/:id", requireResourceOwnerOrAdmin(Quiz), deleteQuiz);

module.exports = router;
