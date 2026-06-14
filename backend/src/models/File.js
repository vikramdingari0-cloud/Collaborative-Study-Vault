// ============================================
// File.js — File Metadata Schema (MongoDB Model)
// ============================================
// Holds reference documents (PDFs, slides, images) uploaded by students.
// Files can be stored under a workspace or nested inside a specific Folder (topic).
// ============================================

const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      maxlength: [200, "File name cannot exceed 200 characters"],
    },

    // Cloudinary secure URL
    url: {
      type: String,
      required: [true, "File URL is required"],
    },

    // For file deletion from Cloudinary hosting
    publicId: {
      type: String,
      required: [true, "Cloudinary publicId is required"],
    },

    // MIME type or extension representation (e.g. pdf, image, doc)
    fileType: {
      type: String,
      required: [true, "File type is required"],
    },

    // File size in bytes
    size: {
      type: Number,
    },

    // The workspace this file belongs to
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // Optional folder for topic-wise organization
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    // User who uploaded the resource
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup of resources inside study rooms
fileSchema.index({ workspace: 1 });
fileSchema.index({ folder: 1 });
fileSchema.index({ workspace: 1, folder: 1 });

const File = mongoose.model("File", fileSchema);

module.exports = File;
