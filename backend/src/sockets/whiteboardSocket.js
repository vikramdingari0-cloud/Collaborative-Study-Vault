// ============================================
// whiteboardSocket.js — Whiteboard WebSocket Handler
// ============================================
// Manages real-time drawing actions inside workspace rooms.
// Stores in-memory drawing stroke logs for sync on entry.
// ============================================

const { assertSocketWorkspaceMember } = require("../utils/socketAuth");
const logger = require("../utils/logger");

const whiteboardHistory = {}; // { [workspaceId]: Array of strokes }

module.exports = (io, socket) => {
  socket.on("join_whiteboard", async ({ workspaceId }) => {
    try {
      const role = await assertSocketWorkspaceMember(socket, workspaceId);
      if (!role) return;

      const whiteboardRoom = `whiteboard_${workspaceId}`;
      socket.join(whiteboardRoom);

      // Send current drawing history to the newly joined client
      const history = whiteboardHistory[workspaceId] || [];
      socket.emit("whiteboard_history", history);

      logger.info(
        `🔌 Realtime whiteboard join [Workspace: ${workspaceId}] [User: ${socket.user.name}]`
      );
    } catch (err) {
      logger.error(`Whiteboard join socket failed: ${err.message}`);
    }
  });

  socket.on("draw_stroke", async ({ workspaceId, stroke }) => {
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

      // Broadcast to other users in the room
      socket.to(`whiteboard_${workspaceId}`).emit("receive_stroke", stroke);
    } catch (err) {
      logger.error(`Whiteboard draw socket failed: ${err.message}`);
    }
  });

  socket.on("clear_whiteboard", async ({ workspaceId }) => {
    try {
      const role = await assertSocketWorkspaceMember(socket, workspaceId);
      if (!role) return;

      whiteboardHistory[workspaceId] = [];
      io.to(`whiteboard_${workspaceId}`).emit("whiteboard_cleared");
      logger.info(`🧹 Whiteboard cleared [Workspace: ${workspaceId}]`);
    } catch (err) {
      logger.error(`Whiteboard clear socket failed: ${err.message}`);
    }
  });

  socket.on("undo_stroke", async ({ workspaceId }) => {
    try {
      const role = await assertSocketWorkspaceMember(socket, workspaceId);
      if (!role) return;

      if (whiteboardHistory[workspaceId] && whiteboardHistory[workspaceId].length > 0) {
        whiteboardHistory[workspaceId].pop();
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
