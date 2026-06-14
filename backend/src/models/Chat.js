// ============================================
// Chat.js — Chat Message Schema
// ============================================
// Each message belongs to a workspace (study group chat).
//
// DESIGN DECISIONS:
// - Messages reference workspace (room-based chat)
// - Sender references User
// - Attachments support file sharing in chat
// - Timestamps enable chronological display
//
// SOCKET.IO INTEGRATION:
// When a new message is saved to MongoDB,
// Socket.IO broadcasts it to all users in the workspace room.
// This creates real-time group chat.
// ============================================

const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    // Which workspace/study group this message belongs to
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // Who sent this message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Message content
    message: {
      type: String,
      required: [true, "Message cannot be empty"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    // Message type
    type: {
      type: String,
      enum: ["text", "file", "system", "ai"],
      default: "text",
    },

    // File attachments (Cloudinary URLs)
    attachments: [
      {
        url: String,
        filename: String,
        fileType: String,
      },
    ],

    // Has this message been edited?
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES — Speed up chat queries
// ============================================
// Messages are always queried by workspace + time
chatSchema.index({ workspace: 1, createdAt: -1 });
chatSchema.index({ sender: 1 });

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
