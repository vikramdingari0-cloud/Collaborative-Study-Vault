/**
 * One-time repair: set null/missing note.content and versionHistory.content to "".
 * Run: npm run fix:notes (from backend folder)
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { normalizeMongoUri } = require("../src/config/mongoUri");
const { configureMongoDns } = require("../src/config/mongoDns");
const Note = require("../src/models/Note");
const { sanitizeNoteDocument } = require("../src/utils/sanitizeNote");

const run = async () => {
  const uri = normalizeMongoUri(process.env.MONGO_URI);
  if (!uri) {
    console.error("MONGO_URI missing in backend/.env");
    process.exit(1);
  }
  configureMongoDns(uri);
  await mongoose.connect(uri);

  const notes = await Note.find({});
  let fixed = 0;

  for (const note of notes) {
    sanitizeNoteDocument(note);
    if (note.isModified()) {
      await note.save();
      fixed += 1;
      console.log("Fixed:", note._id.toString(), note.title);
    }
  }

  console.log(`\nDone. Repaired ${fixed} of ${notes.length} note(s).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
