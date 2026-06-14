// ============================================
// quizController.js — Quiz Request Handlers
// ============================================
// Controller layer for revision study quizzes. Maps incoming Express HTTP queries,
// registers scoring results, coordinates quiz generation workflows,
// and ensures proper apiResponse codes and errors are handled.
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const quizService = require("../services/quizService");

// @desc    Generate a new active recall quiz from a note
// @route   POST /api/v1/quizzes/generate
// @access  Private
const generateQuiz = asyncHandler(async (req, res) => {
  const { noteId, difficulty } = req.body;
  const userId = req.user._id;

  if (!noteId) {
    return apiResponse(res, 400, false, "noteId is required to generate a quiz");
  }

  const quiz = await quizService.generateQuiz(noteId, userId, difficulty || "medium");
  apiResponse(res, 201, true, "Quiz created and generated successfully", quiz);
});

// @desc    Get all quizzes inside a workspace study room
// @route   GET /api/v1/quizzes/workspace/:workspaceId
// @access  Private
const getWorkspaceQuizzes = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const quizzes = await quizService.getWorkspaceQuizzes(workspaceId);
  apiResponse(res, 200, true, "Workspace quizzes retrieved successfully", quizzes);
});

// @desc    Get details of a single quiz (including history attempts)
// @route   GET /api/v1/quizzes/:id
// @access  Private
const getQuizById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quiz = await quizService.getQuizById(id);
  apiResponse(res, 200, true, "Quiz details retrieved", quiz);
});

// @desc    Submit score attempt on a quiz
// @route   POST /api/v1/quizzes/:id/attempt
// @access  Private
const submitAttempt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { correctAnswers, score } = req.body;
  const userId = req.user._id;

  if (correctAnswers === undefined && score === undefined) {
    return apiResponse(res, 400, false, "correctAnswers or score is required in the body");
  }

  const updatedQuiz = await quizService.submitQuizAttempt(id, userId, {
    correctAnswers: correctAnswers !== undefined ? parseInt(correctAnswers, 10) : undefined,
    score: score !== undefined ? parseInt(score, 10) : undefined,
  });
  apiResponse(res, 200, true, "Quiz attempt grade recorded", updatedQuiz);
});

// @desc    Delete a quiz
// @route   DELETE /api/v1/quizzes/:id
// @access  Private
const deleteQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await quizService.deleteQuiz(id);
  apiResponse(res, 200, true, "Quiz deleted successfully");
});

module.exports = {
  generateQuiz,
  getWorkspaceQuizzes,
  getQuizById,
  submitAttempt,
  deleteQuiz,
};
