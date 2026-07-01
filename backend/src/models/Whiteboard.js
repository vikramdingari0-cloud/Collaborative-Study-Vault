// ============================================
// Whiteboard.js — Whiteboard Schema (MongoDB Model)
// ============================================
// Persistent storage for collaborative drawing whiteboard history.
// ============================================

const mongoose = require("mongoose");

const whiteboardSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true, // One whiteboard per workspace
      index: true,
    },
    strokes: {
      type: Array, // Stores drawing stroke objects (points, color, width, tool, etc.)
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Whiteboard = mongoose.model("Whiteboard", whiteboardSchema);

module.exports = Whiteboard;
