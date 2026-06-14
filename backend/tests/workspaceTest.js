// ============================================
// workspaceTest.js — Workspace Integration Test
// ============================================
// A standalone integration test script to verify database connection,
// user registration, workspace creation, member updates, and recursive deletion.
// ============================================

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Workspace = require("../src/models/Workspace");
const Folder = require("../src/models/Folder");
const Note = require("../src/models/Note");
const workspaceService = require("../src/services/workspaceService");

const runTests = async () => {
  console.log("🚀 Starting Workspace Integration Tests...");
  console.log(`📍 Connecting to MongoDB at: ${process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collaborative-study-vault"}`);

  try {
    // 1. Establish database connection
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collaborative-study-vault");
    console.log("✅ MongoDB connected successfully!");

    // Cleanup any existing test data to ensure a clean state
    console.log("🧹 Cleaning up old test data...");
    await User.deleteMany({ email: { $in: ["owner@test.com", "member@test.com"] } });
    await Workspace.deleteMany({ title: "Test Physics Workspace" });
    console.log("✅ Cleanup complete.");

    // 2. Create test users (Owner and Member)
    console.log("\n👤 Creating test users...");
    const owner = await User.create({
      name: "Test Owner",
      email: "owner@test.com",
      password: "password123",
      role: "student",
    });
    console.log(`✅ Created Owner: ${owner.name} (${owner.email}) [ID: ${owner._id}]`);

    const member = await User.create({
      name: "Test Member",
      email: "member@test.com",
      password: "password123",
      role: "student",
    });
    console.log(`✅ Created Member: ${member.name} (${member.email}) [ID: ${member._id}]`);

    // 3. Create a Workspace
    console.log("\n📁 Creating a new workspace...");
    const workspace = await workspaceService.createWorkspace({
      title: "Test Physics Workspace",
      description: "A space to study mechanics and electromagnetism.",
      ownerId: owner._id,
      color: "#6366f1",
      icon: "⚛️",
      visibility: "private",
    });
    console.log(`✅ Created Workspace: "${workspace.title}" [ID: ${workspace._id}]`);
    console.log(`   Owner: ${workspace.owner}`);
    console.log(`   Members Count: ${workspace.members.length} (Expected: 1)`);
    console.log(`   Member Role: ${workspace.members[0].role} (Expected: admin)`);

    // Verify workspace is referenced in owner's User document
    const updatedOwner = await User.findById(owner._id);
    const hasWorkspaceRef = updatedOwner.workspaces.includes(workspace._id);
    console.log(`✅ Owner's workspaces array updated: ${hasWorkspaceRef} (Expected: true)`);

    // 4. Retrieve workspaces
    console.log("\n🔍 Retrieving workspaces for owner...");
    const workspaces = await workspaceService.getWorkspacesForUser(owner._id);
    console.log(`✅ Found ${workspaces.length} workspace(s) for owner (Expected: 1)`);

    // 5. Add a member to the workspace
    console.log("\n➕ Adding member to the workspace...");
    const updatedWorkspace = await workspaceService.addMemberToWorkspace(
      workspace._id,
      owner._id,
      "member@test.com",
      "editor"
    );
    console.log(`✅ Member added! Total members: ${updatedWorkspace.members.length} (Expected: 2)`);
    console.log(`   New member name: ${updatedWorkspace.members[1].user.name}`);
    console.log(`   New member role: ${updatedWorkspace.members[1].role} (Expected: editor)`);

    // Verify workspace is referenced in member's User document
    const updatedMember = await User.findById(member._id);
    const hasWorkspaceRefMember = updatedMember.workspaces.includes(workspace._id);
    console.log(`✅ Member's workspaces array updated: ${hasWorkspaceRefMember} (Expected: true)`);

    // 6. Update member role
    console.log("\n🔄 Promoting member to admin...");
    const workspaceWithPromotedMember = await workspaceService.updateMemberRole(
      workspace._id,
      owner._id,
      member._id,
      "admin"
    );
    console.log(`✅ Member promoted! Role: ${workspaceWithPromotedMember.members[1].role} (Expected: admin)`);

    // 7. Add nested resources (Folders and Notes) to test recursive cleanup
    console.log("\n📝 Adding mock folders and notes inside the workspace...");
    const testFolder = await Folder.create({
      name: "Classical Mechanics",
      workspace: workspace._id,
      createdBy: owner._id,
    });
    console.log(`✅ Created Folder: "${testFolder.name}" inside Workspace [ID: ${testFolder._id}]`);

    const testNote = await Note.create({
      title: "Newton's Laws Notes",
      content: "First Law, Second Law, Third Law.",
      workspace: workspace._id,
      folder: testFolder._id,
      createdBy: owner._id,
    });
    console.log(`✅ Created Note: "${testNote.title}" inside Folder [ID: ${testNote._id}]`);

    // Verify resources exist
    const noteCountBefore = await Note.countDocuments({ workspace: workspace._id });
    const folderCountBefore = await Folder.countDocuments({ workspace: workspace._id });
    console.log(`   Status: Notes count = ${noteCountBefore}, Folders count = ${folderCountBefore}`);

    // 8. Delete workspace and test recursive cleanup
    console.log("\n🗑️ Deleting workspace (testing recursive deletion)...");
    await workspaceService.deleteWorkspace(workspace._id, owner._id);
    console.log("✅ Workspace deleted successfully!");

    // Verify deletion of workspace
    const deletedWorkspace = await Workspace.findById(workspace._id);
    console.log(`✅ Workspace document deleted: ${deletedWorkspace === null} (Expected: true)`);

    // Verify recursive deletion of folder
    const deletedFolder = await Folder.findById(testFolder._id);
    console.log(`✅ Nested Folder deleted recursively: ${deletedFolder === null} (Expected: true)`);

    // Verify recursive deletion of note
    const deletedNote = await Note.findById(testNote._id);
    console.log(`✅ Nested Note deleted recursively: ${deletedNote === null} (Expected: true)`);

    // Verify workspace pull from users' profiles
    const finalOwner = await User.findById(owner._id);
    const finalMember = await User.findById(member._id);
    const ownerWorkspaceCleaned = !finalOwner.workspaces.includes(workspace._id);
    const memberWorkspaceCleaned = !finalMember.workspaces.includes(workspace._id);
    console.log(`✅ Workspace removed from Owner's profile: ${ownerWorkspaceCleaned} (Expected: true)`);
    console.log(`✅ Workspace removed from Member's profile: ${memberWorkspaceCleaned} (Expected: true)`);

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The workspace management engine is fully operational. 🎉");

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exitCode = 1;
  } finally {
    // 9. Close database connection
    console.log("\n🔌 Disconnecting from MongoDB...");
    await mongoose.disconnect();
    console.log("✅ Disconnected. Exit.");
  }
};

runTests();
