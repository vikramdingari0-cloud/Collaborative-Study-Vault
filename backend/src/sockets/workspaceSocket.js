const logger = require("../utils/logger");
const { assertSocketNoteAccess } = require("../utils/socketAuth");

const noteLocks = {};

module.exports = (io, socket) => {
  socket.on("join_note", async ({ noteId }) => {
    const access = await assertSocketNoteAccess(socket, noteId, false);
    if (!access) return;

    // Release lock on previous note if switching notes
    if (socket.collabNoteId && socket.collabNoteId !== noteId) {
      releaseNoteLock(socket, socket.collabNoteId);
      socket.leave(`note_${socket.collabNoteId}`);
    }

    const noteRoom = `note_${noteId}`;
    socket.join(noteRoom);

    socket.collabNoteId = noteId;
    socket.collabUserId = socket.user._id.toString();
    socket.collabUserName = socket.user.name;

    const activeLock = noteLocks[noteId];
    if (activeLock) {
      socket.emit("note_locked", {
        lockedBy: activeLock.name,
        userId: activeLock.userId,
      });
    }
  });

  socket.on("edit_note", async ({ noteId, content }) => {
    const access = await assertSocketNoteAccess(socket, noteId, true);
    if (!access) return;

    socket.to(`note_${noteId}`).emit("note_update", { content });
  });

  socket.on("cursor_move", async ({ noteId, position }) => {
    const access = await assertSocketNoteAccess(socket, noteId, false);
    if (!access) return;

    socket.to(`note_${noteId}`).emit("cursor_update", {
      socketId: socket.id,
      user: {
        _id: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar,
      },
      position,
    });
  });

  socket.on("lock_note", async ({ noteId }) => {
    const access = await assertSocketNoteAccess(socket, noteId, true);
    if (!access) return;

    const existingLock = noteLocks[noteId];
    const userId = socket.user._id.toString();

    if (!existingLock || existingLock.socketId === socket.id) {
      noteLocks[noteId] = {
        userId,
        name: socket.user.name,
        socketId: socket.id,
        lockedAt: new Date(),
      };

      socket.to(`note_${noteId}`).emit("note_locked", {
        lockedBy: socket.user.name,
        userId,
      });
    }
  });

  socket.on("unlock_note", ({ noteId }) => {
    if (!noteId) return;
    releaseNoteLock(socket, noteId);
  });

  socket.on("leave_note", ({ noteId }) => {
    if (!noteId) return;
    socket.leave(`note_${noteId}`);
    releaseNoteLock(socket, noteId);
  });

  socket.on("disconnect", () => {
    if (socket.collabNoteId) {
      releaseNoteLock(socket, socket.collabNoteId);
    }
  });
};

function releaseNoteLock(socket, noteId) {
  const activeLock = noteLocks[noteId];
  if (activeLock && activeLock.socketId === socket.id) {
    delete noteLocks[noteId];
    socket.to(`note_${noteId}`).emit("note_unlocked");
  }
}
