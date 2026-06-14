const logger = require("../utils/logger");
const { assertSocketWorkspaceMember } = require("../utils/socketAuth");

const activeWorkspaces = {};

module.exports = (io, socket) => {
  socket.on("join_presence", async ({ workspaceId }) => {
    const role = await assertSocketWorkspaceMember(socket, workspaceId);
    if (!role) return;

    const user = socket.user;
    const presenceRoom = `presence_${workspaceId}`;
    socket.join(presenceRoom);

    socket.presenceWorkspaceId = workspaceId;
    socket.presenceUserId = user._id.toString();

    if (!activeWorkspaces[workspaceId]) {
      activeWorkspaces[workspaceId] = {};
    }

    activeWorkspaces[workspaceId][user._id] = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || "👤",
      socketId: socket.id,
    };

    logger.info(`User ${user.name} online in workspace ${workspaceId}`);

    io.to(presenceRoom).emit(
      "presence_update",
      Object.values(activeWorkspaces[workspaceId])
    );
  });

  socket.on("leave_presence", () => {
    handlePresenceTeardown(io, socket);
  });

  socket.on("disconnect", () => {
    handlePresenceTeardown(io, socket);
  });
};

function handlePresenceTeardown(io, socket) {
  const { presenceWorkspaceId, presenceUserId } = socket;

  if (presenceWorkspaceId && presenceUserId && activeWorkspaces[presenceWorkspaceId]) {
    const userSession = activeWorkspaces[presenceWorkspaceId][presenceUserId];
    if (userSession && userSession.socketId === socket.id) {
      delete activeWorkspaces[presenceWorkspaceId][presenceUserId];
    }

    if (Object.keys(activeWorkspaces[presenceWorkspaceId]).length === 0) {
      delete activeWorkspaces[presenceWorkspaceId];
    } else {
      io.to(`presence_${presenceWorkspaceId}`).emit(
        "presence_update",
        Object.values(activeWorkspaces[presenceWorkspaceId])
      );
    }

    socket.presenceWorkspaceId = null;
    socket.presenceUserId = null;
  }
}
