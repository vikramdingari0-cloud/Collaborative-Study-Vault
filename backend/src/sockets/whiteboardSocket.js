// ============================================
// whiteboardSocket.js — Whiteboard WebSocket Handler
// ============================================
// Manages real-time drawing actions inside workspace rooms.
// Stores drawing stroke logs in memory + persists to MongoDB via debounce.
// ============================================

const { assertSocketWorkspaceMember } = require("../utils/socketAuth");
const logger = require("../utils/logger");
const Whiteboard = require("../models/Whiteboard");
const { isRateLimited } = require("../utils/socketRateLimiter");

const whiteboardHistory = {}; // { [workspaceId]: Array of strokes }
const saveDebounceTimers = {}; // { [workspaceId]: NodeJS.Timeout }

/**
 * Schedule a debounced MongoDB persistence save for a workspace's whiteboard.
 * Avoids hammering the database on high-frequency drawing events.
 *
 * @param {string} workspaceId
 */
const queuePersistWhiteboard = (workspaceId) => {
  if (saveDebounceTimers[workspaceId]) {
    clearTimeout(saveDebounceTimers[workspaceId]);
  }

  saveDebounceTimers[workspaceId] = setTimeout(async () => {
    try {
      const strokes = whiteboardHistory[workspaceId] || [];
      await Whiteboard.findOneAndUpdate(
        { workspace: workspaceId },
        { strokes },
        { upsert: true, new: true }
      );
      delete saveDebounceTimers[workspaceId];
      logger.info(`💾 Whiteboard persisted to MongoDB [Workspace: ${workspaceId}]`);
    } catch (err) {
      logger.error(`Failed to persist whiteboard to MongoDB: ${err.message}`);
    }
  }, 4000); // 4 seconds debounce
};

module.exports = (io, socket) => {
  socket.on("join_whiteboard", async ({ workspaceId }) => {
    if (isRateLimited(socket, "join_whiteboard")) return;

    try {
      const role = await assertSocketWorkspaceMember(socket, workspaceId);
      if (!role) return;

      const whiteboardRoom = `whiteboard_${workspaceId}`;
      socket.join(whiteboardRoom);

      // Load from database if not already cached in memory
      if (!whiteboardHistory[workspaceId]) {
        const board = await Whiteboard.findOne({ workspace: workspaceId });
        whiteboardHistory[workspaceId] = board ? board.strokes : [];
      }

      // Send current drawing history to the newly joined client
      const history = whiteboardHistory[workspaceId];
      socket.emit("whiteboard_history", history);

      logger.info(
        `🔌 Realtime whiteboard join [Workspace: ${workspaceId}] [User: ${socket.user.name}]`
      );
    } catch (err) {
      logger.error(`Whiteboard join socket failed: ${err.message}`);
    }
  });

  socket.on("draw_stroke", async ({ workspaceId, stroke }) => {
    if (isRateLimited(socket, "draw_stroke")) return;

    try {
      const role = await assertSocketWorkspaceMember(socket, workspaceId);
      if (!role) return;

      if (!whiteboardHistory[workspaceId]) {
        whiteboardHistory[workspaceId] = [];
      }

      // Record stroke to history (cap at 2000 strokes to prevent unbounded RAM usage)
      whiteboardHistory[workspaceId].push(stroke);
      if (whiteboardHistory[workspaceId].length > 2000) {
        whiteboardHistory[workspaceId] = whiteboardHistory[workspaceId].slice(-2000);
      }

      // Trigger debounced save to database
      queuePersistWhiteboard(workspaceId);

      // Broadcast to other users in the room
      socket.to(`whiteboard_${workspaceId}`).emit("receive_stroke", stroke);
    } catch (err) {
      logger.error(`Whiteboard draw socket failed: ${err.message}`);
    }
  });

  socket.on("clear_whiteboard", async ({ workspaceId }) => {
    if (isRateLimited(socket, "clear_whiteboard")) return;

    try {
      const role = await assertSocketWorkspaceMember(socket, workspaceId);
      if (!role) return;

      whiteboardHistory[workspaceId] = [];

      // Trigger debounced save to database
      queuePersistWhiteboard(workspaceId);

      io.to(`whiteboard_${workspaceId}`).emit("whiteboard_cleared");
      logger.info(`🧹 Whiteboard cleared [Workspace: ${workspaceId}]`);
    } catch (err) {
      logger.error(`Whiteboard clear socket failed: ${err.message}`);
    }
  });

  socket.on("undo_stroke", async ({ workspaceId }) => {
    if (isRateLimited(socket, "undo_stroke")) return;

    try {
      const role = await assertSocketWorkspaceMember(socket, workspaceId);
      if (!role) return;

      if (whiteboardHistory[workspaceId] && whiteboardHistory[workspaceId].length > 0) {
        whiteboardHistory[workspaceId].pop();

        // Trigger debounced save to database
        queuePersistWhiteboard(workspaceId);

        io.to(`whiteboard_${workspaceId}`).emit("whiteboard_history", whiteboardHistory[workspaceId]);
        logger.info(`↩ Whiteboard undo stroke [Workspace: ${workspaceId}]`);
      }
    } catch (err) {
      logger.error(`Whiteboard undo socket failed: ${err.message}`);
    }
  });

  socket.on("leave_whiteboard", ({ workspaceId }) => {
    if (!workspaceId) return;
    socket.leave(`whiteboard_${workspaceId}`);
  });
};
