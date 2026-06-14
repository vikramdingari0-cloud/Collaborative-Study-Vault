// ============================================
// quizService.js — Quiz Management Business Logic
// ============================================
// Orchestrates the lifecycles of practice study quizzes. Initiates generative
// quiz calls to aiService, creates Quiz documents referencing MongoDB workspaces,
// coordinates grading logs, and preserves revision attempts history.
// ============================================

const Quiz = require("../models/Quiz");
const Note = require("../models/Note");
const aiService = require("../services/aiService");

/**
 * Generate a new quiz from a source study note
 * @param {string} noteId - Source Note ID
 * @param {string} userId - Requesting User ID
 * @param {string} difficulty - easy | medium | hard
 * @returns {Promise<Object>} Created Quiz document
 */
const generateQuiz = async (noteId, userId, difficulty = "medium") => {
  const note = await Note.findById(noteId);
  if (!note) {
    const error = new Error("Source note not found");
    error.statusCode = 404;
    throw error;
  }

  // Request quiz generation via generative or Mock AI engine
  const generatedQuizData = await aiService.generateQuizFromNote(note.title, note.content, difficulty);

  // Build Quiz schema document
  const quiz = await Quiz.create({
    title: generatedQuizData.title || `Active Recall Quiz: ${note.title}`,
    workspace: note.workspace,
    sourceNote: note._id,
    createdBy: userId,
    questions: generatedQuizData.questions,
    totalQuestions: generatedQuizData.questions.length,
    generatedByAI: true,
  });

  return await Quiz.findById(quiz._id)
    .populate("createdBy", "name email")
    .populate("sourceNote", "title");
};

/**
 * Fetch all quizzes inside a workspace study room
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Array>} Workspace quizzes
 */
const getWorkspaceQuizzes = async (workspaceId) => {
  return await Quiz.find({ workspace: workspaceId })
    .populate("createdBy", "name email avatar")
    .populate("sourceNote", "title")
    .sort({ createdAt: -1 });
};

/**
 * Get full quiz details by ID
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} Quiz document
 */
const getQuizById = async (quizId) => {
  const quiz = await Quiz.findById(quizId)
    .populate("createdBy", "name email avatar")
    .populate("sourceNote", "title")
    .populate("attempts.user", "name email avatar");

  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    throw error;
  }

  return quiz;
};

/**
 * Record a student practice attempt and quiz grade score
 * @param {string} quizId - Quiz ID
 * @param {string} userId - Student User ID
 * @param {Object} attemptData - { correctAnswers, score }
 *   correctAnswers: raw count of correct answers (0 to totalQuestions)
 *   score: percentage score (0-100), auto-calculated if not provided
 * @returns {Promise<Object>} Updated quiz document
 */
const submitQuizAttempt = async (quizId, userId, attemptData) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    throw error;
  }

  const totalQ = quiz.totalQuestions || quiz.questions.length || 1;

  // Determine correctAnswers and score
  let correctAnswers = attemptData.correctAnswers;
  let score = attemptData.score;

  if (correctAnswers !== undefined) {
    correctAnswers = Math.max(0, Math.min(totalQ, parseInt(correctAnswers, 10) || 0));
    // Auto-calculate percentage if not provided
    if (score === undefined) {
      score = Math.round((correctAnswers / totalQ) * 100);
    }
  }

  // Validate and clamp score to 0-100 percentage
  score = Math.max(0, Math.min(100, parseInt(score, 10) || 0));

  // If correctAnswers not provided but score is, derive it
  if (correctAnswers === undefined) {
    correctAnswers = Math.round((score / 100) * totalQ);
  }

  // Push new attempt log
  quiz.attempts.push({
    user: userId,
    correctAnswers,
    score,
    totalQuestions: totalQ,
    completedAt: new Date(),
  });

  await quiz.save();

  return await Quiz.findById(quizId)
    .populate("createdBy", "name email avatar")
    .populate("sourceNote", "title")
    .populate("attempts.user", "name email avatar");
};

/**
 * Delete a study quiz
 * @param {string} quizId - Quiz ID
 */
const deleteQuiz = async (quizId) => {
  const quiz = await Quiz.findByIdAndDelete(quizId);
  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    throw error;
  }
};

module.exports = {
  generateQuiz,
  getWorkspaceQuizzes,
  getQuizById,
  submitQuizAttempt,
  deleteQuiz,
};
