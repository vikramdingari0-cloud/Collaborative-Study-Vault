// ============================================
// cleanupTest.js — Database Housekeeping Integration Test
// ============================================
// A standalone integration test script to verify guest account registration,
// mock expiration (setting createdAt to 25 hours ago),
// and running the housekeeping daemon task to verify recursive cascaded deletes.
// ============================================

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Workspace = require("../src/models/Workspace");
const Folder = require("../src/models/Folder");
const Note = require("../src/models/Note");
const { runGuestCleanup } = require("../src/jobs/cleanupJob");

const runTests = async () => {
  console.log("🚀 Starting Guest Account Expiration Housekeeping Integration Tests...");
  console.log("📍 Connecting to MongoDB...");

  try {
    // 1. Establish database connection
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collaborative-study-vault");
    console.log("✅ MongoDB connected successfully!");

    // Clean up any old test accounts
    await User.deleteMany({ email: { $in: ["expired-guest@studyvault.com", "active-guest@studyvault.com"] } });
    console.log("🧹 Previous test guest users cleaned up.");

    // 2. Create an EXPIRED guest account (created 25 hours ago)
    console.log("\n👤 Creating an expired guest user (created 25 hours ago)...");
    const expiredTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    
    const expiredGuest = await User.create({
      name: "Expired Guest",
      email: "expired-guest@studyvault.com",
      password: "guestPassword123",
      isGuest: true,
      createdAt: expiredTimestamp,
    });
    console.log(`✅ Expired guest created: ${expiredGuest.name} [ID: ${expiredGuest._id}]`);

    // Create a workspace, folder, and note owned by this expired guest
    const expiredWorkspace = await Workspace.create({
      title: "Expired Guest Chemistry Workspace",
      owner: expiredGuest._id,
      createdAt: expiredTimestamp,
    });
    console.log(`   └─ Created Workspace: "${expiredWorkspace.title}" [ID: ${expiredWorkspace._id}]`);

    const expiredFolder = await Folder.create({
      name: "Acids and Bases",
      workspace: expiredWorkspace._id,
      createdBy: expiredGuest._id,
      createdAt: expiredTimestamp,
    });
    console.log(`   └─ Created Folder: "${expiredFolder.name}" [ID: ${expiredFolder._id}]`);

    const expiredNote = await Note.create({
      title: "pH Levels Study Guide",
      content: "pH stands for potential of hydrogen...",
      workspace: expiredWorkspace._id,
      folder: expiredFolder._id,
      createdBy: expiredGuest._id,
      createdAt: expiredTimestamp,
    });
    console.log(`   └─ Created Note: "${expiredNote.title}" [ID: ${expiredNote._id}]`);

    // 3. Create an ACTIVE guest account (created 2 hours ago — should NOT be cleaned up)
    console.log("\n👤 Creating an active guest user (created 2 hours ago)...");
    const activeTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    const activeGuest = await User.create({
      name: "Active Guest",
      email: "active-guest@studyvault.com",
      password: "guestPassword123",
      isGuest: true,
      createdAt: activeTimestamp,
    });
    console.log(`✅ Active guest created: ${activeGuest.name} [ID: ${activeGuest._id}]`);

    const activeWorkspace = await Workspace.create({
      title: "Active Guest Physics Workspace",
      owner: activeGuest._id,
      createdAt: activeTimestamp,
    });
    console.log(`   └─ Created Workspace: "${activeWorkspace.title}" [ID: ${activeWorkspace._id}]`);

    // 4. Run the Guest Cleanup Housekeeping Daemon
    console.log("\n🧹 Triggering database cleanup job...");
    await runGuestCleanup();
    console.log("✅ Cleanup job execution complete.");

    // 5. Verification Phase
    console.log("\n🔍 Verifying cleanup outcomes...");

    // A. Expired Guest Check
    const checkExpiredGuest = await User.findById(expiredGuest._id);
    const checkExpiredWorkspace = await Workspace.findById(expiredWorkspace._id);
    const checkExpiredFolder = await Folder.findById(expiredFolder._id);
    const checkExpiredNote = await Note.findById(expiredNote._id);

    console.log(`   - Expired Guest user deleted: ${checkExpiredGuest === null} (Expected: true)`);
    console.log(`   - Expired Guest workspace deleted recursively: ${checkExpiredWorkspace === null} (Expected: true)`);
    console.log(`   - Expired Guest folder deleted recursively: ${checkExpiredFolder === null} (Expected: true)`);
    console.log(`   - Expired Guest note deleted recursively: ${checkExpiredNote === null} (Expected: true)`);

    if (checkExpiredGuest || checkExpiredWorkspace || checkExpiredFolder || checkExpiredNote) {
      throw new Error("Expired guest files or user document still exist in database!");
    }

    // B. Active Guest Check
    const checkActiveGuest = await User.findById(activeGuest._id);
    const checkActiveWorkspace = await Workspace.findById(activeWorkspace._id);

    console.log(`   - Active Guest user retained: ${checkActiveGuest !== null} (Expected: true)`);
    console.log(`   - Active Guest workspace retained: ${checkActiveWorkspace !== null} (Expected: true)`);

    if (!checkActiveGuest || !checkActiveWorkspace) {
      throw new Error("Active guest user or workspace was incorrectly cleaned up!");
    }

    // Final Cleanup of Active Guest to leave database perfectly pristine
    console.log("\n🧹 Cleaning up remaining active guest mock files...");
    await Workspace.findByIdAndDelete(activeWorkspace._id);
    await User.findByIdAndDelete(activeGuest._id);
    console.log("✅ Final cleanup complete.");

    console.log("\n🎉 ALL HOUSEKEEPING CLEANUP TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exitCode = 1;
  } finally {
    console.log("\n🔌 Disconnecting from MongoDB...");
    await mongoose.disconnect();
    console.log("✅ Disconnected. Exit.");
  }
};

runTests();
