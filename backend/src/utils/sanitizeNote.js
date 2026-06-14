/**
 * Normalize note content fields before validate/save (fixes legacy null content in MongoDB).
 */
const sanitizeNoteDocument = (note) => {
  if (!note) return note;

  if (note.content == null || typeof note.content !== "string") {
    note.content = "";
    note.markModified("content");
  }

  if (Array.isArray(note.versionHistory)) {
    let fixed = false;
    note.versionHistory.forEach((entry) => {
      if (entry.content == null || typeof entry.content !== "string") {
        entry.content = "";
        fixed = true;
      }
    });
    if (fixed) note.markModified("versionHistory");
  }

  return note;
};

module.exports = { sanitizeNoteDocument };
