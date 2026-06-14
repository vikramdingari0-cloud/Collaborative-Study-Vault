// ============================================
// seed.js — Database Seeder for Demo / Recruiter Setup
// ============================================
// Run: npm run seed (from project root or backend folder)
// ============================================

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Folder = require("../models/Folder");
const Note = require("../models/Note");
const Chat = require("../models/Chat");
const Quiz = require("../models/Quiz");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collaborative-study-vault";

const CARBONYL_CONTENT = `## Nucleophilic Acyl Substitution Notes

Nucleophilic acyl substitution is a key class of organic reactions involving a carbonyl carbon bonded to a leaving group.

### Core Reaction Mechanism
The reaction proceeds through a two-step addition-elimination pathway:
1. **Nucleophilic Addition**: The nucleophile attacks the carbonyl carbon, breaking the carbon-oxygen double bond and forming a tetrahedral intermediate.
2. **Leaving Group Elimination**: The carbon-oxygen double bond reforms, forcing the elimination of the leaving group.

### Leaving Group Reactivity Series
1. **Acid Chlorides** (most reactive)
2. **Acid Anhydrides**
3. **Esters / Carboxylic Acids**
4. **Amides** (least reactive)

### Key Reagents
- **Grignard Reagents (R-MgBr)**: Attacks carbonyls twice to yield tertiary alcohols.
- **LiAlH4**: Reduces acyl structures to primary alcohols or amines.`;

const AROMATIC_CONTENT = `## Electrophilic Aromatic Substitution (EAS) Notes

In EAS, an electrophile replaces one of the hydrogen atoms on an aromatic benzene ring.

### Sigma Complex
The reaction relies on a resonant **Sigma Complex** (Arenium Ion), which temporarily breaks aromaticity before deprotonation restores it.

### Directing Groups
- **Activators (Electron-Donating)**: Direct ortho/para (e.g. -OH, -NH2).
- **Deactivators (Electron-Withdrawing)**: Direct meta (e.g. -NO2, -C≡N).
- **Halogens**: Deactivators that direct ortho/para due to resonance.`;

const DEMO_SUMMARY = `### Study Summary: Nucleophilic Acyl Substitutions

#### Overview
This note covers nucleophilic acyl substitution at carbonyl carbons, focusing on reactivity order and key reagents.

#### Critical Learning Points
- Tetrahedral intermediates form during nucleophilic addition.
- Acid chlorides are the most reactive acyl derivatives; amides are the least.
- Grignard reagents add twice to form tertiary alcohols.

#### Study Strategy
Use **Generate Study Quiz** and flashcards for active recall on this material.`;

const seedData = async () => {
  try {
    console.log("[Seeder] Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("[Seeder] Connected. Clearing collections...");

    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Folder.deleteMany({});
    await Note.deleteMany({});
    await Chat.deleteMany({});
    await Quiz.deleteMany({});

    console.log("[Seeder] Creating demo users...");

    const recruiter = await User.create({
      name: "Dr. Jane Recruiter",
      email: "recruiter@university.edu",
      password: "password123",
      role: "university",
      avatar: "👩‍🏫",
    });

    const aiTutor = await User.create({
      name: "StudyVault AI",
      email: "ai-tutor@studyvault.com",
      password: "system_ai_account_not_for_login",
      role: "student",
      avatar: "🤖",
    });

    console.log("[Seeder] Demo user: recruiter@university.edu / password123");

    const workspace = await Workspace.create({
      title: "Organic Chemistry II (MCAT Prep)",
      description: "Collaborative MCAT prep vault with carbonyl chemistry notes, chat, and AI study aids.",
      owner: recruiter._id,
      members: [{ user: recruiter._id, role: "admin" }],
      code: "SV9D4A",
      color: "#6366f1",
      icon: "🧪",
      visibility: "shared",
      isDemo: true,
    });

    await User.findByIdAndUpdate(recruiter._id, {
      $addToSet: { workspaces: workspace._id },
    });

    console.log("[Seeder] Workspace created with join code: SV9D4A");

    const folder1 = await Folder.create({
      name: "Unit 1: Carbonyl Chemistry",
      workspace: workspace._id,
      parentFolder: null,
      createdBy: recruiter._id,
    });

    const folder2 = await Folder.create({
      name: "Unit 2: Aromatic Rings",
      workspace: workspace._id,
      parentFolder: null,
      createdBy: recruiter._id,
    });

    const note1 = await Note.create({
      title: "Nucleophilic Acyl Substitutions",
      content: CARBONYL_CONTENT,
      workspace: workspace._id,
      folder: folder1._id,
      createdBy: recruiter._id,
      aiSummary: DEMO_SUMMARY,
      aiFlashcards: [
        {
          front: "Which acyl compound is most reactive toward nucleophiles?",
          back: "Acid chlorides — chlorine is an excellent leaving group.",
        },
        {
          front: "What intermediate forms during nucleophilic acyl substitution?",
          back: "A tetrahedral intermediate (sp3 carbonyl carbon).",
        },
        {
          front: "Why are amides resistant to nucleophilic attack?",
          back: "Nitrogen lone-pair resonance stabilizes the carbonyl and reduces electrophilicity.",
        },
        {
          front: "What forms when an ester reacts with excess Grignard reagent?",
          back: "A tertiary alcohol (double nucleophilic addition).",
        },
      ],
    });

    const note2 = await Note.create({
      title: "Electrophilic Aromatic Substitution (EAS)",
      content: AROMATIC_CONTENT,
      workspace: workspace._id,
      folder: folder2._id,
      createdBy: recruiter._id,
    });

    console.log("[Seeder] Folders and notes created.");

    await Chat.create([
      {
        workspace: workspace._id,
        sender: recruiter._id,
        message: "Hello everyone! Welcome to the Organic Chemistry II Collaborative Study Vault! 👋",
        type: "text",
      },
      {
        workspace: workspace._id,
        sender: recruiter._id,
        message: "Carbonyl Chemistry notes are in Unit 1. Try generating a quiz or flashcards from the sidebar!",
        type: "text",
      },
      {
        workspace: workspace._id,
        sender: aiTutor._id,
        message: "I'm your StudyVault AI tutor. Type /ai in chat to ask questions about your notes!",
        type: "ai",
      },
    ]);

    console.log("[Seeder] Chat history written.");

    await Quiz.create({
      title: "Carbonyl Chemistry (Seed Study Guide)",
      workspace: workspace._id,
      sourceNote: note1._id,
      createdBy: recruiter._id,
      generatedByAI: true,
      totalQuestions: 3,
      questions: [
        {
          question: "What primarily determines the reactivity order of carboxylic acid derivatives?",
          options: [
            "Steric hindrance of alkyl chains",
            "Leaving group ability (basicity of the substituent)",
            "Molecular weight of the compounds",
            "Solvent polarity",
          ],
          correctAnswer: 1,
          explanation: "Weaker bases are better leaving groups. Cl⁻ makes acid chlorides highly reactive; NH₂⁻ makes amides stable.",
          difficulty: "medium",
        },
        {
          question: "What is formed when an acid anhydride reacts with excess ethanol?",
          options: [
            "An ether and carboxylic acid",
            "Two aldehydes",
            "An ester and carboxylic acid",
            "A ketone and primary alcohol",
          ],
          correctAnswer: 2,
          explanation: "Ethanol attacks one carbonyl; the other half leaves as carboxylate, giving an ethyl ester plus carboxylic acid.",
          difficulty: "medium",
        },
        {
          question: "What is the directing effect of a nitro (-NO₂) group on benzene during EAS?",
          options: [
            "Activator; ortho/para",
            "Deactivator; ortho/para",
            "Activator; meta",
            "Deactivator; meta",
          ],
          correctAnswer: 3,
          explanation: "Nitro is strongly electron-withdrawing and directs electrophiles to the meta position.",
          difficulty: "medium",
        },
      ],
    });

    console.log("[Seeder] Quiz created.");
    console.log("=================================================");
    console.log("[Seeder] DATABASE SEED COMPLETED SUCCESSFULLY");
    console.log("  Login:  recruiter@university.edu / password123");
    console.log("  Join:   SV9D4A");
    console.log("  Run:    npm run dev");
    console.log("=================================================");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[Seeder] Failed:", err.message);
    process.exit(1);
  }
};

seedData();
