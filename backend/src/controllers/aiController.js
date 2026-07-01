// ============================================
// aiController.js — AI Request Handlers
// ============================================
// Controller layer for artificial intelligence services. Links express HTTP routes
// to the underlying generative aiService, retrieving note contents from MongoDB,
// updating notes with generated summaries, and serving contextual tutoring sessions.
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const Note = require("../models/Note");
const aiService = require("../services/aiService");
const { sanitizeNoteDocument } = require("../utils/sanitizeNote");

// @desc    Generate summary from note content and save it
// @route   POST /api/v1/ai/summarize
// @access  Private
const summarizeNote = asyncHandler(async (req, res) => {
  const { noteId } = req.body;

  if (!noteId) {
    return apiResponse(res, 400, false, "noteId is required");
  }

  const note = await Note.findById(noteId);
  if (!note) {
    return apiResponse(res, 404, false, "Note not found");
  }

  // Generate summary
  const summary = await aiService.generateSummary(note.title, note.content);

  note.aiSummary = summary;
  sanitizeNoteDocument(note);
  await note.save();

  apiResponse(res, 200, true, "Note summary generated successfully", {
    noteId: note._id,
    aiSummary: summary,
  });
});

// @desc    Interact with the AI study tutor relative to a specific note's content
// @route   POST /api/v1/ai/explain
// @access  Private
const explainConcept = asyncHandler(async (req, res) => {
  const { noteId, prompt, history = [] } = req.body;

  if (!noteId || !prompt) {
    return apiResponse(res, 400, false, "noteId and prompt are required");
  }

  const note = await Note.findById(noteId);
  if (!note) {
    return apiResponse(res, 404, false, "Note not found");
  }

  // Ask tutor
  const reply = await aiService.askTutor(note.title, note.content, history, prompt);

  apiResponse(res, 200, true, "Tutor response completed", {
    reply,
  });
});

// @desc    Generate active recall flashcards from note content and save it
// @route   POST /api/v1/ai/flashcards
// @access  Private
const generateFlashcards = asyncHandler(async (req, res) => {
  const { noteId } = req.body;

  if (!noteId) {
    return apiResponse(res, 400, false, "noteId is required");
  }

  const note = await Note.findById(noteId);
  if (!note) {
    return apiResponse(res, 404, false, "Note not found");
  }

  // Generate flashcards
  const result = await aiService.generateFlashcards(note.title, note.content);

  // Update note aiFlashcards field
  note.aiFlashcards = result.flashcards || [];
  sanitizeNoteDocument(note);
  await note.save();

  apiResponse(res, 200, true, "Flashcards generated successfully", {
    noteId: note._id,
    aiFlashcards: note.aiFlashcards,
  });
});

// @desc    Analyze whiteboard drawing via AI Vision
// @route   POST /api/v1/ai/analyze-image
// @access  Private
const analyzeWhiteboard = asyncHandler(async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return apiResponse(res, 400, false, "imageBase64 is required");
  }
  const explanation = await aiService.analyzeImage(imageBase64);
  apiResponse(res, 200, true, "Image analyzed", { explanation });
});

module.exports = {
  summarizeNote,
  explainConcept,
  generateFlashcards,
  analyzeWhiteboard,
};
