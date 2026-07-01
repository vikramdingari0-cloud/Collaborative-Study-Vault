// ============================================
// noteService.js — Note Business Logic
// ============================================

const Note = require("../models/Note");
const Folder = require("../models/Folder");
const { sanitizeNoteDocument } = require("../utils/sanitizeNote");

const assertFolderInWorkspace = async (folderId, workspaceId) => {
  if (!folderId) return;

  const folder = await Folder.findById(folderId);
  if (!folder) {
    const error = new Error("Folder not found");
    error.statusCode = 404;
    throw error;
  }

  if (folder.workspace.toString() !== workspaceId.toString()) {
    const error = new Error("Folder does not belong to this workspace");
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Create a new note
 * @param {Object} noteData - { title, content, workspaceId, folderId, userId, tags }
 * @returns {Object} Created note
 */
const createNote = async ({ title, content = "", workspaceId, folderId = null, userId, tags = [] }) => {
  await assertFolderInWorkspace(folderId, workspaceId);

  return await Note.create({
    title,
    content,
    workspace: workspaceId,
    folder: folderId || null,
    createdBy: userId,
    tags,
  });
};

/**
 * Get all notes in a workspace (optionally filtered by folder)
 * @param {string} workspaceId - Workspace ID
 * @param {string|null} folderId - Folder ID (optional)
 * @returns {Array} Notes
 */
const getNotesForWorkspace = async (workspaceId, folderId = null, page = 1, limit = 50) => {
  const query = { workspace: workspaceId };
  if (folderId !== null) {
    query.folder = folderId === "root" ? null : folderId;
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [notes, total] = await Promise.all([
    Note.find(query)
      .populate("createdBy", "name email avatar")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Note.countDocuments(query),
  ]);

  return { notes, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Get single note details (with full version history populated)
 * @param {string} noteId - Note ID
 * @returns {Object} Note
 */
const getNoteById = async (noteId) => {
  const note = await Note.findById(noteId)
    .populate("createdBy", "name email avatar")
    .populate("versionHistory.editedBy", "name email");

  if (!note) {
    const error = new Error("Note not found");
    error.statusCode = 404;
    throw error;
  }

  return note;
};

/**
 * Update note (auto-saving and generating a version entry if content is changed)
 * @param {string} noteId - Note ID
 * @param {string} userId - Requesting User ID
 * @param {Object} updateData - { title, content, folder, isPinned, tags, aiSummary }
 * @returns {Object} Updated note
 */
const updateNote = async (noteId, userId, updateData) => {
  const note = await Note.findById(noteId);

  if (!note) {
    const error = new Error("Note not found");
    error.statusCode = 404;
    throw error;
  }

  sanitizeNoteDocument(note);

  if (updateData.content !== undefined) {
    const oldContent = note.content;
    const newContent = typeof updateData.content === "string" ? updateData.content : "";

    if (newContent !== oldContent) {
      note.versionHistory.push({
        content: oldContent,
        editedBy: userId,
        editedAt: new Date(),
      });
      if (note.versionHistory.length > 50) {
        note.versionHistory = note.versionHistory.slice(-50);
      }
    }
    note.content = newContent;
  }

  if (updateData.folder !== undefined) {
    const newFolderId = updateData.folder === "root" ? null : updateData.folder;
    await assertFolderInWorkspace(newFolderId, note.workspace);
    note.folder = newFolderId;
  }

  const allowedUpdates = ["title", "isPinned", "tags", "aiSummary"];
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      note[field] = updateData[field];
    }
  });

  note.lastSavedAt = new Date();
  await note.save();

  return await Note.findById(noteId)
    .populate("createdBy", "name email avatar")
    .populate("versionHistory.editedBy", "name email");
};

/**
 * Delete a note
 * @param {string} noteId - Note ID
 */
const deleteNote = async (noteId) => {
  const note = await Note.findByIdAndDelete(noteId);
  if (!note) {
    const error = new Error("Note not found");
    error.statusCode = 404;
    throw error;
  }
};

/**
 * Escape a string for safe use inside a MongoDB $regex expression.
 * Prevents ReDoS by neutralising special regex characters in user input.
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Search notes in workspace by text index or regex fallback
 */
const searchNotesInWorkspace = async (workspaceId, queryText) => {
  if (!queryText) return [];

  // Try text index search first
  let notes = await Note.find({
    workspace: workspaceId,
    $text: { $search: queryText }
  })
  .populate("createdBy", "name email avatar");

  // Fallback to regex if text index finds nothing — escape input to prevent ReDoS
  if (notes.length === 0) {
    const safeQuery = escapeRegex(queryText.trim().slice(0, 200)); // also cap length
    notes = await Note.find({
      workspace: workspaceId,
      title: { $regex: safeQuery, $options: "i" }
    })
    .populate("createdBy", "name email avatar");
  }

  return notes;
};

module.exports = {
  createNote,
  getNotesForWorkspace,
  getNoteById,
  updateNote,
  deleteNote,
  searchNotesInWorkspace,
};
