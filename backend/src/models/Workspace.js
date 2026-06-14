// ============================================
// Workspace.js — Workspace Schema (MongoDB Model)
// ============================================
// A Workspace is the central container of your app.
// Think of it like a "project" or "study room."
//
// Each workspace has:
// - An owner (the creator)
// - Members (collaborators)
// - Notes, folders, and files inside it
//
// RELATIONSHIPS:
// Owner → User (one-to-one)
// Members → Users (one-to-many)
// Notes → Note collection (referenced)
// Folders → Folder collection (referenced)
// ============================================

const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Workspace title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    // Who created this workspace
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // All members who can access this workspace
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["viewer", "editor", "admin"],
          default: "editor",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Workspace visibility
    visibility: {
      type: String,
      enum: ["private", "public", "shared"],
      default: "private",
    },

    // Tags for organization
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Color theme for UI
    color: {
      type: String,
      default: "#6366f1", // Indigo
    },

    // Workspace icon/emoji
    icon: {
      type: String,
      default: "📚",
    },

    // Short join code for inviting collaborators (e.g. SV9D4A)
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: [10, "Join code cannot exceed 10 characters"],
    },

    // Is this a pre-seeded demo workspace?
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEX — Speed up queries by workspace owner
// ============================================
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ "members.user": 1 });
workspaceSchema.index({ updatedAt: -1 });

const Workspace = mongoose.model("Workspace", workspaceSchema);

module.exports = Workspace;
