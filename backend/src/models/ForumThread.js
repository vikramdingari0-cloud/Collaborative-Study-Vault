const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    isAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const forumThreadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    replies: [replySchema],
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

forumThreadSchema.index({ workspace: 1 });
forumThreadSchema.index({ isResolved: 1 });

module.exports = mongoose.model("ForumThread", forumThreadSchema);
