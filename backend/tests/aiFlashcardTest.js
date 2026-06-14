// ============================================
// aiFlashcardTest.js — AI Flashcard Integration Test
// ============================================
// A standalone integration test script to verify note AI flashcard generation
// (Gemini vs. Mock fallbacks) and persistence on the Note model.
// ============================================

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Workspace = require("../src/models/Workspace");
const Note = require("../src/models/Note");

const aiService = require("../src/services/aiService");

const runTests = async () => {
  console.log("🚀 Starting AI Flashcard Integration Tests...");
  console.log(`📍 Connecting to MongoDB...`);

  try {
    // 1. Establish database connection
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collaborative-study-vault");
    console.log("✅ MongoDB connected successfully!");

    // Cleanup existing test data
    await User.deleteMany({ email: "flashcard-tester@test.com" });
    console.log("🧹 Previous test users cleaned up.");

    // 2. Create test user and workspace
    const user = await User.create({
      name: "Flashcard Tester",
      email: "flashcard-tester@test.com",
      password: "password123",
      role: "student",
    });

    const workspace = await Workspace.create({
      title: "AI Biology Workspace",
      owner: user._id,
    });

    // Create a detailed note to feed the AI flashcard generator
    const noteContent = `
# Cellular Biology: Photosynthesis and Chloroplasts

Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy that, through cellular respiration, can later be released to fuel the organism's activities.

Chloroplasts are organelles that conduct photosynthesis, where the photosynthetic pigment chlorophyll captures the energy from sunlight, converts it, and stores it in the energy-storage molecules ATP and NADPH while freeing oxygen from water in plant and algal cells.

The light-dependent reactions take place in the thylakoid membranes, whereas the Calvin cycle (light-independent reactions) takes place in the stroma.
    `;

    const note = await Note.create({
      title: "Photosynthesis and Chloroplasts",
      content: noteContent,
      workspace: workspace._id,
      createdBy: user._id,
    });
    console.log(`✅ Created Note: "${note.title}" [ID: ${note._id}]`);

    // 3. Test AI Flashcard Generation (will automatically fall back to Mock if no GEMINI_API_KEY is present)
    console.log("\n🃏 Triggering AI Flashcard Generation...");
    const hasKey = !!process.env.GEMINI_API_KEY;
    console.log(`ℹ️ GEMINI_API_KEY status: ${hasKey ? "Key Found! Using Google Gemini API 🚀" : "Key Missing. Using Local Mock AI Fallback Parser 🛠️"}`);

    const result = await aiService.generateFlashcards(note.title, note.content);
    console.log("✅ AI Flashcards generated successfully!");
    console.log(`   Flashcards Count: ${result.flashcards?.length || 0}`);

    // Print first flashcard to verify structure
    const fc1 = result.flashcards[0];
    console.log("\n📋 Sample Flashcard Packet:");
    console.log(`   Front: "${fc1.front}"`);
    console.log(`   Back:  "${fc1.back}"`);

    // Save flashcards to Note
    note.aiFlashcards = result.flashcards || [];
    await note.save();
    console.log(`✅ Flashcards successfully saved to Note model!`);

    // Verify saved note
    const retrievedNote = await Note.findById(note._id);
    console.log(`✅ Verified Note in DB: contains ${retrievedNote.aiFlashcards.length} saved flashcards!`);

    // Cleanup all test data
    console.log("\n🧹 Cleaning up generated test database documents...");
    await Note.findByIdAndDelete(note._id);
    await Workspace.findByIdAndDelete(workspace._id);
    await User.findByIdAndDelete(user._id);
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 ALL AI FLASHCARD TESTS PASSED SUCCESSFULLY! 🎉");

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
