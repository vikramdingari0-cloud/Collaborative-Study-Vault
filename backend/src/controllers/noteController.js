// ============================================
// noteController.js — Note Request Handlers
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const noteService = require("../services/noteService");

// @desc    Create a new note
// @route   POST /api/v1/notes
// @access  Private
const createNote = asyncHandler(async (req, res) => {
  const { title, content, workspaceId, folderId, tags } = req.body;
  const userId = req.user._id;

  if (!title || !workspaceId) {
    return apiResponse(res, 400, false, "Note title and workspaceId are required");
  }

  const note = await noteService.createNote({
    title,
    content: typeof content === "string" ? content : "",
    workspaceId,
    folderId,
    userId,
    tags,
  });

  apiResponse(res, 201, true, "Note created successfully", note);
});

// @desc    Get all notes for a workspace (optional folder filter)
// @route   GET /api/v1/notes/workspace/:workspaceId
// @access  Private
const getWorkspaceNotes = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { folderId, page, limit } = req.query; // can be "root" or undefined/null or direct ID

  const result = await noteService.getNotesForWorkspace(
    workspaceId,
    folderId || null,
    parseInt(page, 10) || 1,
    parseInt(limit, 10) || 50
  );
  apiResponse(res, 200, true, "Notes retrieved successfully", result.notes, undefined, {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  });
});

// @desc    Get details of a single note (including version history)
// @route   GET /api/v1/notes/:id
// @access  Private
const getNoteById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await noteService.getNoteById(id);
  apiResponse(res, 200, true, "Note details retrieved", note);
});

// @desc    Update note content / settings
// @route   PUT /api/v1/notes/:id
// @access  Private
const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const body = { ...req.body };
  if (body.content !== undefined) {
    body.content = typeof body.content === "string" ? body.content : "";
  }

  const note = await noteService.updateNote(id, userId, body);
  apiResponse(res, 200, true, "Note updated successfully", note);
});

// @desc    Delete note
// @route   DELETE /api/v1/notes/:id
// @access  Private
const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await noteService.deleteNote(id);
  apiResponse(res, 200, true, "Note deleted successfully");
});

// @desc    Search notes in a workspace
// @route   GET /api/v1/notes/workspace/:workspaceId/search
// @access  Private
const searchWorkspaceNotes = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { q } = req.query;

  const notes = await noteService.searchNotesInWorkspace(workspaceId, q || "");
  apiResponse(res, 200, true, "Search completed successfully", notes);
});

module.exports = {
  createNote,
  getWorkspaceNotes,
  getNoteById,
  updateNote,
  deleteNote,
  searchWorkspaceNotes,
};
