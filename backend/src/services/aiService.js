// ============================================
// aiService.js — Generative AI Core Engine
// ============================================
// Interfaces with Google's Gemini 1.5 Flash API using robust direct REST calls.
// Engineered with a highly intelligent "Local Mock AI Service" fallback that parses
// note contents programmatically to build dynamic summaries and fill-in-the-blank
// active-recall quizzes when no API key is provided.
// ============================================

const { summarizePrompt, quizPrompt, chatPrompt, flashcardPrompt } = require("../ai/promptTemplates");
const {
  classifyTutorQuery,
  OFF_TOPIC_REPLY,
  APP_KNOWLEDGE,
} = require("../ai/tutorRouter");
const { quizResponseSchema, flashcardResponseSchema } = require("../ai/jsonSchemas");
const logger = require("../utils/logger");
const { callGemini, callGeminiVision, isConfigured, forceLocalAi } = require("../utils/geminiClient");

/**
 * Clean and normalize note content to prevent API formatting issues
 */
const getCleanContent = (content) => {
  if (!content || content.trim().length === 0) {
    return "This note is currently empty. Add content to begin learning.";
  }
  return content.trim();
};

/** Keep chat tutor replies short for the study chat UI */
const shortenTutorReply = (text, maxLen = 300) => {
  if (!text) return "No reply.";
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen).trim()}...`;
};

/**
 * Generate a professional Markdown summary of note content
 * @param {string} title - Note title
 * @param {string} content - Note body text
 * @returns {Promise<string>} Summary markdown
 */
const generateSummary = async (title, content) => {
  const cleanContent = getCleanContent(content);
  const prompt = summarizePrompt(title, cleanContent);

  if (isConfigured()) {
    try {
      logger.info(`🤖 Requesting Gemini Summary for note: "${title}"`);
      const result = await callGemini(prompt, { label: "summary" });
      if (result?.text) return result.text;
    } catch (err) {
      logger.warn(`Gemini summary unavailable, using mock: ${err.message}`);
    }
  }

  // Fallback to highly sophisticated Mock Summary Engine
  return generateMockSummary(title, cleanContent);
};

/**
 * Generate a structured Active Recall study quiz from note content
 * @param {string} title - Note title
 * @param {string} content - Note body text
 * @param {string} difficulty - easy | medium | hard
 * @returns {Promise<Object>} Structured Quiz payload { title, questions: [...] }
 */
const generateQuizFromNote = async (title, content, difficulty = "medium") => {
  const cleanContent = getCleanContent(content);
  const prompt = quizPrompt(title, cleanContent, difficulty);

  if (isConfigured()) {
    try {
      logger.info(`🤖 Requesting Gemini Quiz for note: "${title}" [Difficulty: ${difficulty}]`);
      const result = await callGemini(prompt, {
        label: "quiz",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: quizResponseSchema,
        },
      });
      if (result?.text) return JSON.parse(result.text);
    } catch (err) {
      logger.warn(`Gemini quiz unavailable, using mock: ${err.message}`);
    }
  }

  // Fallback to programmatic Mock Quiz Engine
  return generateMockQuiz(title, cleanContent, difficulty);
};

/**
 * Ask the note study tutor a question
 * @param {string} title - Note title
 * @param {string} content - Note body text
 * @param {Array} chatHistory - Previous messages
 * @param {string} userMessage - Student question
 * @returns {Promise<string>} Tutor reply
 */
const askTutor = async (title, content, chatHistory = [], userMessage) => {
  const { intent, subIntent } = classifyTutorQuery(userMessage);

  if (intent === "OFF_TOPIC") {
    return OFF_TOPIC_REPLY;
  }

  if (intent === "APP_HELP") {
    const appReply = generateAppHelpResponse(subIntent);
    return shortenTutorReply(appReply);
  }

  const cleanContent = getCleanContent(content);
  const isEmptyNote =
    !content?.trim() ||
    cleanContent.includes("currently empty") ||
    cleanContent.includes("Add content");

  if (isEmptyNote && intent === "NOTE_STUDY") {
    return shortenTutorReply(
      `Note "${title}" has no content yet. Add study text, then ask again — or type /ai help for StudyVault features.`
    );
  }

  const prompt = chatPrompt(title, cleanContent, chatHistory, userMessage, intent);

  if (isConfigured() && !forceLocalAi()) {
    try {
      const result = await callGemini(prompt, { label: "tutor", maxRetries: 0 });
      if (result?.text) {
        return shortenTutorReply(enforceStudyScope(result.text, intent));
      }
    } catch (err) {
      logger.warn(`Gemini tutor unavailable, using local tutor: ${err.message}`);
    }
  }

  const mockReply = generateMockTutorResponse(title, cleanContent, userMessage, intent, subIntent);
  return shortenTutorReply(mockReply);
};

/** Reject replies that drift off StudyVault / note scope */
const enforceStudyScope = (text, intent) => {
  const lower = text.toLowerCase();
  const driftPatterns = [
    /\b(as an ai language model|i cannot browse|openai|chatgpt)\b/i,
    /\b(weather|stock market|recipe|movie|celebrity)\b/i,
  ];
  if (driftPatterns.some((re) => re.test(text))) {
    return intent === "APP_HELP"
      ? APP_KNOWLEDGE.general
      : OFF_TOPIC_REPLY;
  }
  if (intent === "NOTE_STUDY" && /\b(studyvault|workspace|join code|dashboard)\b/i.test(lower) && text.length > 200) {
    return text.split(/[.!?]/)[0]?.trim() + ".";
  }
  return text;
};

const generateAppHelpResponse = (subIntent) => {
  return APP_KNOWLEDGE[subIntent] || APP_KNOWLEDGE.general;
};

/**
 * Generate active recall flashcards from note content
 * @param {string} title - Note title
 * @param {string} content - Note body text
 * @returns {Promise<Object>} Structured Flashcards payload { flashcards: [...] }
 */
const generateFlashcards = async (title, content) => {
  const cleanContent = getCleanContent(content);
  const prompt = flashcardPrompt(title, cleanContent);

  if (isConfigured()) {
    try {
      logger.info(`🤖 Requesting Gemini Flashcards for note: "${title}"`);
      const result = await callGemini(prompt, {
        label: "flashcards",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: flashcardResponseSchema,
        },
      });
      if (result?.text) return JSON.parse(result.text);
    } catch (err) {
      logger.warn(`Gemini flashcards unavailable, using mock: ${err.message}`);
    }
  }

  // Fallback to programmatic Mock Flashcard Engine
  return generateMockFlashcards(title, cleanContent);
};

/**
 * Analyze an image (e.g. whiteboard drawing)
 * @param {string} base64Data - Base64 image data
 */
const analyzeImage = async (base64Data) => {
  const prompt = "Analyze this whiteboard drawing or notes image. Explain what it is, point out key concepts, and provide a clear, educational summary. Keep it concise but insightful.";
  
  // Extract base64 without the data URI prefix (e.g. 'data:image/png;base64,')
  let cleanBase64 = base64Data;
  let mimeType = "image/png";
  if (base64Data.includes(",")) {
    const parts = base64Data.split(",");
    cleanBase64 = parts[1];
    const match = parts[0].match(/:(.*?);/);
    if (match) {
      mimeType = match[1];
    }
  }

  if (isConfigured()) {
    try {
      logger.info(`🤖 Requesting Gemini Vision Analysis for image`);
      const result = await callGeminiVision(prompt, cleanBase64, mimeType);
      if (result?.text) return result.text;
    } catch (err) {
      logger.warn(`Gemini Vision unavailable, using mock: ${err.message}`);
    }
  }

  return "This looks like a highly educational diagram! (Mock AI response due to quota limits or lack of API key. Add a Gemini API key to see true visual analysis of your drawings).";
};

// ============================================
// LOCAL MOCK AI ENGINES (HEURISTICS-BASED)
// ============================================

/**
 * Heuristics-based Mock Summary Generator
 */
function generateMockSummary(title, content) {
  const sentences = content.split(/[.!?]\s+/).filter(s => s.trim().length > 15);
  const keywords = extractKeywords(content, 8);

  let summary = `### 📝 Study Summary: ${title}\n\n`;
  summary += `*This is a local AI-generated study summary produced by the StudyVault Heuristic Engine.*\n\n`;

  summary += `#### 📖 Overview & Context\n`;
  if (sentences.length > 0) {
    summary += `This note primarily focuses on **${sentences[0].trim()}**. The subject centers around core concepts including ${keywords.slice(0, 3).map(k => `*${k}*`).join(", ")}.\n\n`;
  } else {
    summary += `This workspace note acts as a central repository for studying **${title}** and coordinating core learning tracks.\n\n`;
  }

  summary += `#### 🔑 Critical Learning Points\n`;
  if (sentences.length > 1) {
    const bullets = sentences.slice(1, Math.min(sentences.length, 5));
    bullets.forEach((s) => {
      summary += `- **Concept Analysis**: ${s.trim()}.\n`;
    });
  } else {
    summary += `- **Structure**: Organize note blocks into structured headings to facilitate active recall.\n`;
    summary += `- **Keywords**: Pay close attention to vocabulary keywords like *${keywords.slice(0, 2).join(", ") || "study terms"}*.\n`;
    summary += `- **Revision**: Convert these points into flashcard-style quizzes for self-testing.\n`;
  }

  summary += `\n#### 💡 Study Strategy & Recommendation\n`;
  summary += `- **Active Recall**: Don't just re-read this notes summary. Click the **"Generate Study Quiz"** button to trigger a practice self-test on these concepts.\n`;
  summary += `- **Spaced Repetition**: Re-evaluate this summary in 2 days, 1 week, and then 1 month to establish long-term cognitive consolidation.\n`;

  return summary;
}

/**
 * Heuristics-based Dynamic Mock Quiz Generator (Fill-in-the-blank style!)
 */
function generateMockQuiz(title, content, difficulty) {
  const sentences = content.split(/[.!?]\s+/).filter(s => s.trim().length > 25);
  const words = content.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "")).filter(w => w.length > 5);

  const questions = [];
  const defaultKeywords = ["Concept", "Structure", "Collaboration", "Vault", "ActiveRecall", "Learning"];

  // Formulate up to 5 questions dynamically using sentences from the note
  const maxQ = Math.min(sentences.length, 5);

  for (let i = 0; i < Math.max(maxQ, 4); i++) {
    let sentence = sentences[i];
    let wordToHide = "";

    if (sentence) {
      // Find a suitable long word in the sentence
      const sWords = sentence.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "")).filter(w => w.length > 5);
      if (sWords.length > 0) {
        wordToHide = sWords[Math.floor(Math.random() * sWords.length)];
      }
    }

    if (!wordToHide) {
      wordToHide = defaultKeywords[i % defaultKeywords.length];
      sentence = `A primary objective of our Collaborative Study Vault is to facilitate effective ________ inside a shared group namespace.`;
    }

    // Standardize correct answer and sentence masking
    const correctAnswerVal = wordToHide;
    const maskedSentence = sentence.replace(new RegExp(`\\b${wordToHide}\\b`, "i"), "________");

    // Gather incorrect distractors from the rest of the text
    const uniqueWords = [...new Set(words.filter(w => w.toLowerCase() !== correctAnswerVal.toLowerCase()))];
    const options = [correctAnswerVal];

    while (options.length < 4) {
      if (uniqueWords.length > 0) {
        const randIndex = Math.floor(Math.random() * uniqueWords.length);
        options.push(uniqueWords.splice(randIndex, 1)[0]);
      } else {
        options.push(defaultKeywords[(options.length + i) % defaultKeywords.length]);
      }
    }

    // Shuffle options array
    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    const correctIndex = shuffledOptions.indexOf(correctAnswerVal);

    questions.push({
      question: `Fill in the blank: "${maskedSentence.trim()}"`,
      options: shuffledOptions,
      correctAnswer: correctIndex >= 0 ? correctIndex : 0,
      explanation: `Based on the note text, the correct word is "${correctAnswerVal}". The complete statement is: "${sentence.trim()}"`,
      difficulty: difficulty,
    });
  }

  return {
    title: `Active Recall: ${title} (${difficulty.toUpperCase()})`,
    questions: questions,
  };
}

/**
 * Heuristics-based Mock Tutor Chatbot
 */
function generateMockTutorResponse(title, content, message, intent = "NOTE_STUDY", subIntent = "answer") {
  if (intent === "APP_HELP") {
    return generateAppHelpResponse(subIntent);
  }

  const keywords = extractKeywords(content, 6);
  const sentences = content.split(/[.!?]\s+/).filter((s) => s.trim().length > 15);
  const q = message.toLowerCase();

  if (subIntent === "summarize" || q.includes("summar")) {
    if (sentences.length > 0) {
      const core = sentences.slice(0, 2).map((s) => s.trim()).join(" ");
      return `From "${title}": ${core.slice(0, 200)}${core.length > 200 ? "..." : ""}`;
    }
    return `Cannot summarize "${title}" — the note has no study content yet.`;
  }

  if (subIntent === "terms" || q.includes("key term")) {
    if (keywords.length > 0) {
      return `Key terms in "${title}": ${keywords.slice(0, 5).join(", ")}.`;
    }
    return `No key terms found in "${title}" — add more study content first.`;
  }

  if (subIntent === "explain" || q.includes("explain") || q.includes("simple")) {
    if (sentences.length > 0) {
      return `In simple terms (${title}): ${sentences[0].trim().slice(0, 180)}`;
    }
    return `"${title}" is empty — add notes before asking for an explanation.`;
  }

  // Direct question: pick best-matching sentence from note
  if (sentences.length > 0) {
    const queryWords = q.split(/\s+/).filter((w) => w.length > 3);
    let best = sentences[0];
    let bestScore = 0;
    for (const s of sentences) {
      const sl = s.toLowerCase();
      const score = queryWords.reduce((n, w) => n + (sl.includes(w) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return `From your note: ${best.trim().slice(0, 220)}`;
  }

  return `I can only answer from "${title}" once you add study content, or use /ai help for StudyVault features.`;
}

/**
 * Utility to extract keywords from text
 */
function extractKeywords(text, count = 5) {
  const commonWords = new Set(["the", "and", "a", "of", "to", "in", "is", "that", "it", "on", "for", "this", "with", "are", "as", "by", "an", "at", "from"]);
  const words = text.toLowerCase()
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 4 && !commonWords.has(w));

  // Count frequencies
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);

  // Sort and slice
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, count);
}

/**
 * Heuristics-based Dynamic Mock Flashcard Generator
 */
function generateMockFlashcards(title, content) {
  const sentences = content.split(/[.!?]\s+/).filter(s => s.trim().length > 25);
  const keywords = extractKeywords(content, 8);
  const flashcards = [];

  // Generate flashcards from sentences or keywords
  const maxFC = Math.min(sentences.length, 6);
  for (let i = 0; i < Math.max(maxFC, 4); i++) {
    const sentence = sentences[i];
    if (sentence) {
      const words = sentence.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "")).filter(w => w.length > 5);
      const wordToHide = words.length > 0 ? words[Math.floor(Math.random() * words.length)] : "concept";
      const question = sentence.replace(new RegExp(`\\b${wordToHide}\\b`, "i"), "________");
      flashcards.push({
        front: `What is the missing word in this study note: "${question.trim()}"?`,
        back: `The correct word is "${wordToHide}". Full statement: "${sentence.trim()}".`
      });
    } else {
      const keyword = keywords[i % keywords.length] || "study";
      flashcards.push({
        front: `Define the concept of: "${keyword.charAt(0).toUpperCase() + keyword.slice(1)}"`,
        back: `This term is a key concept mentioned in the study notes for "${title}". Review your notes to consolidate understanding.`
      });
    }
  }

  return { flashcards };
}

module.exports = {
  generateSummary,
  generateQuizFromNote,
  askTutor,
  generateFlashcards,
  analyzeImage,
};
