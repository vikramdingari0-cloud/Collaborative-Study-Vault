const mongoose = require("mongoose");

const pastPaperSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true }, // Cloudinary PDF URL
    publicId: { type: String, required: true },
    subject: { type: String, required: true },
    year: { type: Number, required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

pastPaperSchema.index({ workspace: 1 });
pastPaperSchema.index({ subject: 1 });

module.exports = mongoose.model("PastPaper", pastPaperSchema);
