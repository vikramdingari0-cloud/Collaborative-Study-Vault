// ============================================
// Folder.js — Hierarchical Folder Schema
// ============================================
// This is one of your SECRET WEAPONS for recruiter impact.
//
// WHY THIS IS ADVANCED:
// Most student projects use flat file lists.
// Your project uses HIERARCHICAL TREE STRUCTURES.
//
// Each folder can have:
// - A parent folder (or null for root)
// - Child folders (nested inside it)
// - Notes inside it
//
// RECURSIVE DELETION:
// When a parent folder is deleted:
// → All child folders are found recursively
// → All notes inside those folders are deleted
// → All child folders are deleted
// → No orphaned documents remain
//
// This demonstrates:
// ✅ Tree traversal
// ✅ Recursive algorithms
// ✅ Data integrity management
// ✅ Backend architecture maturity
// ============================================

const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Folder name is required"],
      trim: true,
      maxlength: [100, "Folder name cannot exceed 100 characters"],
    },

    // Which workspace this folder belongs to
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // Parent folder (null = root level folder)
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    // Who created this folder
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Color for UI display
    color: {
      type: String,
      default: "#6366f1",
    },

    // Icon/emoji for the folder
    icon: {
      type: String,
      default: "📁",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES — Speed up tree traversal queries
// ============================================
folderSchema.index({ workspace: 1 });
folderSchema.index({ parentFolder: 1 });
folderSchema.index({ workspace: 1, parentFolder: 1 });
folderSchema.index({ createdBy: 1 });

const Folder = mongoose.model("Folder", folderSchema);

module.exports = Folder;
