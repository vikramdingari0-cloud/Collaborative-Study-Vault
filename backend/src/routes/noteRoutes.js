// ============================================
// noteRoutes.js — Note API Endpoints
// ============================================

const express = require("express");
const router = express.Router();

const {
  createNote,
  getWorkspaceNotes,
  getNoteById,
  updateNote,
  deleteNote,
  searchWorkspaceNotes,
} = require("../controllers/noteController");

const { protect } = require("../middleware/authMiddleware");
const Note = require("../models/Note");
const {
  requireWorkspaceMember,
  requireWorkspaceMemberFromBody,
  requireResourceWorkspaceMember,
  requireResourceOwnerOrAdmin,
  requireEditorFromContext,
} = require("../middleware/workspaceAuth");

const {
  createNoteRules,
  updateNoteRules,
  searchNoteRules,
  validate,
} = require("../validators/domainValidator");

// Secure all endpoints with protect guard
router.use(protect);

// POST /api/v1/notes — Create note (workspaceId in body)
router.post(
  "/",
  createNoteRules,
  validate,
  requireWorkspaceMemberFromBody,
  requireEditorFromContext,
  createNote
);

// GET /api/v1/notes/workspace/:workspaceId — List notes (workspaceId in params)
router.get("/workspace/:workspaceId", requireWorkspaceMember, getWorkspaceNotes);

// GET /api/v1/notes/workspace/:workspaceId/search — Search notes
router.get(
  "/workspace/:workspaceId/search",
  searchNoteRules,
  validate,
  requireWorkspaceMember,
  searchWorkspaceNotes
);

// GET /api/v1/notes/:id — Get note (look up workspace from note document)
router.get("/:id", requireResourceWorkspaceMember(Note), getNoteById);

// PUT /api/v1/notes/:id — Update note
router.put(
  "/:id",
  updateNoteRules,
  validate,
  requireResourceWorkspaceMember(Note),
  requireEditorFromContext,
  updateNote
);

// DELETE /api/v1/notes/:id — Delete note (owner or admin only)
router.delete("/:id", requireResourceOwnerOrAdmin(Note), deleteNote);

module.exports = router;
