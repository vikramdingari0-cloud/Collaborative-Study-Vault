// ============================================
// Note.js — Note Schema (MongoDB Model)
// ============================================
// Notes are the core content of each workspace.
//
// KEY FEATURES:
// 1. VERSION HISTORY — Every edit is tracked
//    This is advanced backend engineering.
//    Most student projects never implement this.
//
// 2. WORKSPACE REFERENCE — Notes belong to workspaces
//    This creates a relational structure in MongoDB.
//
// 3. COLLABORATORS — Multiple users can edit
//    Supports the real-time collaboration feature.
//
// 4. AUTOSAVE TRACKING — lastSavedAt field
//    Supports the debounced autosave system.
// ============================================

const mongoose = require("mongoose");

// Sub-schema for version history entries
const versionSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      default: "",
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
    // Optional label for important versions
    label: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    // Main content (Markdown format) — empty string allowed
    content: {
      type: String,
      default: "",
    },

    // Which workspace this note belongs to
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // Which folder this note is inside (optional — can be root level)
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    // Who created this note
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who can collaborate on this note
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Version history — array of past versions
    // Every time content is saved, previous version is pushed here
    // Capped at 50 entries to prevent unbounded growth
    versionHistory: {
      type: [versionSchema],
      validate: [
        function (val) {
          return val.length <= 50;
        },
        "Version history cannot exceed 50 entries — oldest versions are automatically trimmed",
      ],
    },

    // For debounced autosave tracking
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },

    // Has AI generated a summary for this note?
    aiSummary: {
      type: String,
      default: "",
    },

    // AI generated flashcards for this note
    aiFlashcards: [
      {
        front: { type: String, required: true },
        back: { type: String, required: true },
      }
    ],

    // Is this note pinned/favorited?
    isPinned: {
      type: Boolean,
      default: false,
    },

    // Tags for filtering/searching
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES — Speed up common queries
// ============================================
noteSchema.index({ workspace: 1 });
noteSchema.index({ createdBy: 1 });
noteSchema.index({ folder: 1 });
noteSchema.index({ workspace: 1, folder: 1 });
noteSchema.index({ workspace: 1, updatedAt: -1 });
noteSchema.index({ title: "text", content: "text" });

const { sanitizeNoteDocument } = require("../utils/sanitizeNote");

noteSchema.pre("validate", function normalizeContent() {
  sanitizeNoteDocument(this);
});

const Note = mongoose.model("Note", noteSchema);

module.exports = Note;
