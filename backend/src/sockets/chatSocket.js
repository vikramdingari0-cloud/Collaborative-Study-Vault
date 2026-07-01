const chatService = require("../services/chatService");
const aiService = require("../services/aiService");
const Note = require("../models/Note");
const User = require("../models/User");
const logger = require("../utils/logger");
const {
  assertSocketWorkspaceMember,
  assertSocketCanEdit,
} = require("../utils/socketAuth");

const { isRateLimited } = require("../utils/socketRateLimiter");

const AI_TUTOR_EMAIL = "ai-tutor@studyvault.com";
let cachedAiUserId = null;

const getAiTutorUserId = async () => {
  if (cachedAiUserId) return cachedAiUserId;

  let aiUser = await User.findOne({ email: AI_TUTOR_EMAIL });
  if (!aiUser) {
    aiUser = await User.create({
      name: "StudyVault AI",
      email: AI_TUTOR_EMAIL,
      password: "system_ai_account_not_for_login",
      role: "student",
      avatar: "🤖",
    });
  }

  cachedAiUserId = aiUser._id;
  return cachedAiUserId;
};

module.exports = (io, socket) => {
  socket.on("join_workspace_chat", async ({ workspaceId }) => {
    if (isRateLimited(socket, "join_workspace_chat")) return;
    
    const role = await assertSocketWorkspaceMember(socket, workspaceId);
    if (!role) return;

    const chatRoom = `workspace_chat_${workspaceId}`;
    socket.join(chatRoom);
    logger.info(`Socket ${socket.id} joined chat: ${chatRoom}`);
  });

  socket.on("send_message", async ({ workspaceId, message, type = "text", noteId = null }) => {
    if (isRateLimited(socket, "send_message")) return;
    try {
      const cleanMessage = (message || "").trim();
      if (!cleanMessage) {
        socket.emit("error", { message: "Message cannot be empty" });
        return;
      }

      const isAiCommand = /^\/ai(\s|$)/i.test(cleanMessage);
      const role = isAiCommand
        ? await assertSocketWorkspaceMember(socket, workspaceId)
        : await assertSocketCanEdit(socket, workspaceId);
      if (!role) return;

      const chatRoom = `workspace_chat_${workspaceId}`;
      const senderId = socket.user._id;

      const savedMessage = await chatService.createMessage({
        workspaceId,
        senderId,
        message: cleanMessage,
        type,
      });

      io.to(chatRoom).emit("receive_message", savedMessage);

      if (!isAiCommand) return;

      const typingId = `typing_${Date.now()}`;
      io.to(chatRoom).emit("receive_message", {
        _id: typingId,
        message: "AI thinking...",
        type: "system",
        createdAt: new Date(),
      });

      try {
        const queryText = cleanMessage.replace(/^\/ai\s*/i, "").trim() || "help";

        let note = null;
        if (noteId) {
          note = await Note.findOne({ _id: noteId, workspace: workspaceId });
        }
        if (!note) {
          note = await Note.findOne({ workspace: workspaceId }).sort({ updatedAt: -1 });
        }

        const noteTitle = note?.title || "Study notes";
        const noteContent = note?.content || "";

        const recent = await chatService.getWorkspaceMessages(workspaceId, 12);
        const chatHistory = recent
          .filter((m) => m.type === "text" || m.type === "ai")
          .slice(-8)
          .map((m) => ({
            role: m.type === "ai" ? "model" : "user",
            text: (m.message || "").replace(/^\/ai\s*/i, "").trim(),
          }));

        const aiReply = await aiService.askTutor(noteTitle, noteContent, chatHistory, queryText);

        const aiUserId = await getAiTutorUserId();
        const savedAiMessage = await chatService.createMessage({
          workspaceId,
          senderId: aiUserId,
          message: aiReply,
          type: "ai",
        });

        io.to(chatRoom).emit("receive_message", savedAiMessage);
      } catch (aiErr) {
        logger.error(`AI tutor failed: ${aiErr.message}`);
        io.to(chatRoom).emit("receive_message", {
          _id: `ai_err_${Date.now()}`,
          message: "AI could not reply. Try again or add note content first.",
          type: "system",
          createdAt: new Date(),
        });
      }
    } catch (err) {
      logger.error(`Chat socket failed: ${err.message}`);
      socket.emit("error", { message: "Failed to send message." });
    }
  });

  socket.on("leave_workspace_chat", ({ workspaceId }) => {
    if (!workspaceId) return;
    socket.leave(`workspace_chat_${workspaceId}`);
  });
};
