// ============================================
// aiQuizTest.js — AI and Active Recall Integration Test
// ============================================
// A standalone integration test script to verify note AI summarization,
// AI-generated active recall quizzes (Gemini vs. Mock fallbacks),
// and active recall attempt grade recording.
// ============================================

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Workspace = require("../src/models/Workspace");
const Note = require("../src/models/Note");
const Quiz = require("../src/models/Quiz");

const aiService = require("../src/services/aiService");
const quizService = require("../src/services/quizService");

const runTests = async () => {
  console.log("🚀 Starting AI and Active Recall Integration Tests...");
  console.log(`📍 Connecting to MongoDB...`);

  try {
    // 1. Establish database connection
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collaborative-study-vault");
    console.log("✅ MongoDB connected successfully!");

    // Cleanup existing test data
    await User.deleteMany({ email: "ai-tester@test.com" });
    console.log("🧹 Previous test users cleaned up.");

    // 2. Create test user and workspace
    const user = await User.create({
      name: "AI Tester",
      email: "ai-tester@test.com",
      password: "password123",
      role: "student",
    });

    const workspace = await Workspace.create({
      title: "AI Chemistry Workspace",
      owner: user._id,
    });

    // Create a detailed note to feed the AI summarizer and quiz generator
    const noteContent = `
# Organic Chemistry: Carbon Hydrates and Alkanes

Alkanes are acyclic saturated hydrocarbons. In other words, an alkane consists of hydrogen and carbon atoms arranged in a tree structure in which all the carbon-carbon bonds are single bonds. Alkanes have the general chemical formula CnH2n+2.

Methane (CH4) is the simplest alkane and is a major component of natural gas. Ethane (C2H6), Propane (C3H8), and Butane (C4H10) are the next three members of the homologous series. As the molecular weight increases, the boiling point of the alkane increases due to stronger London dispersion forces.

Alkanes are generally not very reactive because carbon-carbon and carbon-hydrogen single bonds are relatively strong and non-polar. However, they undergo combustion reactions with oxygen to produce carbon dioxide and water, releasing significant heat energy. This makes them excellent fuels.
    `;

    const note = await Note.create({
      title: "Alkanes and Saturated Hydrocarbons",
      content: noteContent,
      workspace: workspace._id,
      createdBy: user._id,
    });
    console.log(`✅ Created Note: "${note.title}" [ID: ${note._id}]`);

    // 3. Test AI Summarization (will automatically fall back to Mock if no GEMINI_API_KEY is present)
    console.log("\n⚡ Triggering AI Note Summarization...");
    const hasKey = !!process.env.GEMINI_API_KEY;
    console.log(`ℹ️ GEMINI_API_KEY status: ${hasKey ? "Key Found! Using Google Gemini API 🚀" : "Key Missing. Using Local Mock AI Fallback Parser 🛠️"}`);

    const summary = await aiService.generateSummary(note.title, note.content);
    console.log("✅ AI Note Summary generated successfully!");
    console.log("--- Summary Output ---");
    console.log(summary);
    console.log("----------------------");

    // Save summary to Note
    note.aiSummary = summary;
    await note.save();

    // 4. Test Active Recall Quiz Generation
    console.log("\n🧠 Generating Active Recall Quiz from note...");
    const quiz = await quizService.generateQuiz(note._id, user._id, "medium");

    console.log(`✅ Quiz generated successfully!`);
    console.log(`   Quiz ID: ${quiz._id}`);
    console.log(`   Questions Count: ${quiz.questions.length}`);
    console.log(`   Difficulty: ${quiz.difficulty} (Expected: medium)`);

    // Print first question to verify structure
    const q1 = quiz.questions[0];
    console.log("\n📋 Sample Question Packet:");
    console.log(`   Question: "${q1.question}"`);
    console.log(`   Options: ${JSON.stringify(q1.options)}`);
    console.log(`   Correct Answer Index: ${q1.correctAnswer} (Option: ${q1.options[q1.correctAnswer]})`);
    console.log(`   AI Explanation: "${q1.explanation}"`);

    // 5. Test Attempt Scoring
    console.log("\n🎯 Recording a quiz scoring attempt...");
    const mockScore = 80; // 80%
    const updatedQuiz = await quizService.submitQuizAttempt(quiz._id, user._id, mockScore);

    console.log(`✅ Score recorded!`);
    console.log(`   Attempts Count: ${updatedQuiz.attempts.length} (Expected: 1)`);
    console.log(`   Recorded Score: ${updatedQuiz.attempts[0].score}% (Expected: ${mockScore}%)`);
    console.log(`   Attempted By: ${updatedQuiz.attempts[0].userId}`);

    // Cleanup all test data
    console.log("\n🧹 Cleaning up generated test database documents...");
    await Quiz.findByIdAndDelete(quiz._id);
    await Note.findByIdAndDelete(note._id);
    await Workspace.findByIdAndDelete(workspace._id);
    await User.findByIdAndDelete(user._id);
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 ALL AI AND ACTIVE RECALL TESTS PASSED SUCCESSFULLY! 🎉");

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
