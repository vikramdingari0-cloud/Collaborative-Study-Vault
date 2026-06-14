/**
 * Quick MongoDB connection test — run: npm run db:test (from backend folder)
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const { normalizeMongoUri, DEFAULT_DB_NAME } = require("../src/config/mongoUri");
const { configureMongoDns } = require("../src/config/mongoDns");

const rawUri = process.env.MONGO_URI;

if (!rawUri) {
  console.error("FAIL: MONGO_URI is not set in backend/.env");
  process.exit(1);
}

const uri = normalizeMongoUri(rawUri);
configureMongoDns(uri);

console.log("Testing MongoDB connection...");
console.log("Host:", uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"));

if (rawUri !== uri) {
  console.log(`Note: Added database name "${DEFAULT_DB_NAME}" to your URI.`);
  console.log("Recommended .env value:");
  console.log(uri.replace(/\/\/([^:]+):([^@]+)@/, "//USER:PASS@"));
}

const helpForError = (err) => {
  const msg = err.message || "";
  console.error("\nFAIL:", msg);

  if (msg.includes("ECONNREFUSED") || msg.includes("querySrv")) {
    console.error("\nLikely causes:");
    console.error("  1. Windows/Node DNS blocked SRV — add to .env: MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1");
    console.error("  2. No internet / VPN / firewall blocking DNS");
    console.error("  3. Atlas → Network Access → add your IP (or 0.0.0.0/0 for dev)");
  }
  if (msg.includes("authentication failed") || msg.includes("bad auth")) {
    console.error("\nFix: Atlas → Database Access → verify username/password in MONGO_URI");
  }
  if (msg.includes("ENOTFOUND")) {
    console.error("\nFix: Check cluster hostname matches Atlas → Connect → Drivers");
  }
};

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 20000 })
  .then(async (conn) => {
    console.log("\nSUCCESS: Connected to", conn.connection.host);
    console.log("Database:", conn.connection.name);

    // Quick read/write ping
    const collections = await conn.connection.db.listCollections().toArray();
    console.log("Collections:", collections.length ? collections.map((c) => c.name).join(", ") : "(empty — run npm run seed)");

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    helpForError(err);
    process.exit(1);
  });
