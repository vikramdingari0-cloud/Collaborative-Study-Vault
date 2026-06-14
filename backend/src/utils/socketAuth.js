const { checkMembership } = require("../middleware/workspaceAuth");
const Note = require("../models/Note");

/**
 * Verify socket user is a member of a workspace. Emits error and returns false if denied.
 */
const assertSocketWorkspaceMember = async (socket, workspaceId) => {
  if (!workspaceId || !socket.user?._id) {
    socket.emit("error", { message: "Invalid workspace or session" });
    return null;
  }

  const { isMember, memberRole, notFound } = await checkMembership(
    workspaceId,
    socket.user._id
  );

  if (notFound) {
    socket.emit("error", { message: "Workspace not found" });
    return null;
  }

  if (!isMember) {
    socket.emit("error", { message: "You do not have access to this workspace" });
    return null;
  }

  return memberRole;
};

/**
 * Verify socket user can edit (not viewer-only).
 */
const assertSocketCanEdit = async (socket, workspaceId) => {
  const role = await assertSocketWorkspaceMember(socket, workspaceId);
  if (!role) return null;

  if (role === "viewer") {
    socket.emit("error", { message: "Viewers cannot edit in this workspace" });
    return null;
  }

  return role;
};

/**
 * Verify note exists and user has workspace access; returns { note, memberRole }.
 */
const assertSocketNoteAccess = async (socket, noteId, requireEdit = false) => {
  if (!noteId) {
    socket.emit("error", { message: "Note ID is required" });
    return null;
  }

  const note = await Note.findById(noteId);
  if (!note) {
    socket.emit("error", { message: "Note not found" });
    return null;
  }

  const checker = requireEdit ? assertSocketCanEdit : assertSocketWorkspaceMember;
  const role = await checker(socket, note.workspace.toString());
  if (!role) return null;

  return { note, memberRole: role };
};

module.exports = {
  assertSocketWorkspaceMember,
  assertSocketCanEdit,
  assertSocketNoteAccess,
};
