/**
 * Classifies /ai chat queries and enforces StudyVault-only scope.
 */

const OFF_TOPIC_PATTERNS = [
  /\b(weather|forecast|temperature)\b/i,
  /\b(stock|crypto|bitcoin|forex)\b/i,
  /\b(recipe|cooking|restaurant)\b/i,
  /\b(movie|netflix|celebrity|sports?|football|cricket)\b/i,
  /\b(politics|election|president|war)\b/i,
  /\b(joke|funny|meme)\b/i,
  /\b(write (me )?code for|python tutorial|javascript project)\b/i,
  /\b(who (is|was)|when (was|did)|where (is|was))\b(?!.*\b(note|study|workspace)\b)/i,
];

const APP_HELP_PATTERNS = [
  /^help$/i,
  /\b(commands?|\/ai)\b/i,
  /\bhow (do|to|can) i\b/i,
  /\b(studyvault|study vault|this app|workspace)\b/i,
  /\b(join code|invite|member|role|viewer|editor|admin)\b/i,
  /\b(version history|edit lock|presence|export|download)\b/i,
  /\b(generate quiz|flashcard|sidebar|dashboard)\b/i,
  /\bwhat (can you|do you) do\b/i,
];

const NOTE_STUDY_PATTERNS = [
  /\b(summarize|summary|explain|simplif|key terms?|define|concept)\b/i,
  /\bwhat (is|are|does|do)\b/i,
  /\bwhy\b/i,
  /\bhow does\b/i,
  /\bquiz\b/i,
  /\bflashcard\b/i,
  /\bnote\b/i,
];

const classifyTutorQuery = (query) => {
  const q = (query || "").trim();
  const lower = q.toLowerCase();

  if (!q) {
    return { intent: "APP_HELP", subIntent: "help" };
  }

  if (OFF_TOPIC_PATTERNS.some((re) => re.test(q))) {
    return { intent: "OFF_TOPIC", subIntent: null };
  }

  if (APP_HELP_PATTERNS.some((re) => re.test(q)) && !NOTE_STUDY_PATTERNS.some((re) => re.test(q))) {
    if (/^help$/i.test(lower) || /\bcommands?\b/i.test(lower)) {
      return { intent: "APP_HELP", subIntent: "help" };
    }
    if (/\bjoin\b/i.test(lower)) {
      return { intent: "APP_HELP", subIntent: "join" };
    }
    if (/\b(invite|member|role)\b/i.test(lower)) {
      return { intent: "APP_HELP", subIntent: "members" };
    }
    if (/\b(quiz|flashcard|summar)/i.test(lower)) {
      return { intent: "APP_HELP", subIntent: "ai_tools" };
    }
    return { intent: "APP_HELP", subIntent: "general" };
  }

  if (NOTE_STUDY_PATTERNS.some((re) => re.test(q))) {
    if (/\bsummar/i.test(lower)) return { intent: "NOTE_STUDY", subIntent: "summarize" };
    if (/\bexplain|simplif/i.test(lower)) return { intent: "NOTE_STUDY", subIntent: "explain" };
    if (/\bkey terms?/i.test(lower)) return { intent: "NOTE_STUDY", subIntent: "terms" };
    return { intent: "NOTE_STUDY", subIntent: "answer" };
  }

  // Short vague messages → app help if not clearly study
  if (lower.length < 20 && /^(hi|hello|hey|thanks|thank you)$/i.test(lower)) {
    return { intent: "APP_HELP", subIntent: "greeting" };
  }

  return { intent: "NOTE_STUDY", subIntent: "answer" };
};

const OFF_TOPIC_REPLY =
  "I only answer StudyVault and your open study note. Try /ai help for app tips or /ai explain for this note.";

const APP_KNOWLEDGE = {
  help: "StudyVault commands: /ai help — app tips; /ai explain — simplify the open note; /ai key terms — vocabulary; /ai summarize — short note recap. Use Recall Hub for quizzes and flashcards.",
  join: "Share your workspace join code from the top bar (Copy code). Teammates enter it on Dashboard → Join workspace.",
  members: "Owners invite by email with viewer, editor, or admin roles. Editors can chat and edit notes; viewers can read and use /ai.",
  ai_tools:
    "Open a note, then: AI Summary and flashcards in the editor area; quizzes in Recall Hub. Chat /ai uses the open note as context.",
  general:
    "StudyVault is a collaborative study room: folders, real-time notes, chat with /ai, version history, and active-recall quizzes.",
  greeting: "Hi! I'm StudyVault AI. Ask /ai help for app commands or /ai explain about your open note.",
};

module.exports = {
  classifyTutorQuery,
  OFF_TOPIC_REPLY,
  APP_KNOWLEDGE,
  OFF_TOPIC_PATTERNS,
};
