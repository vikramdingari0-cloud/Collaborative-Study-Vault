// ============================================
// jsonSchemas.js — Structured AI Output Schemas
// ============================================
// Defines strict OpenAPI-compliant schemas passed to the Gemini API.
// This guarantees the generative model returns fully structured JSON payloads,
// preventing runtime parsing issues and aligning perfectly with our Quiz model.
// ============================================

const quizResponseSchema = {
  type: "OBJECT",
  properties: {
    title: {
      type: "STRING",
      description: "A highly relevant, engaging title for the active recall quiz.",
    },
    questions: {
      type: "ARRAY",
      description: "An array containing high-quality multiple choice questions.",
      items: {
        type: "OBJECT",
        properties: {
          question: {
            type: "STRING",
            description: "The core question statement based on study concepts.",
          },
          options: {
            type: "ARRAY",
            description: "Exactly 4 distinct, plausible multiple-choice options.",
            items: {
              type: "STRING",
            },
          },
          correctAnswer: {
            type: "INTEGER",
            description: "The 0-indexed integer pointing to the correct option (0, 1, 2, or 3).",
          },
          explanation: {
            type: "STRING",
            description: "A detailed explanation of why this specific choice is correct, reinforcing learning concepts.",
          },
          difficulty: {
            type: "STRING",
            enum: ["easy", "medium", "hard"],
            description: "Difficulty categorization based on note depth.",
          },
        },
        required: ["question", "options", "correctAnswer", "explanation", "difficulty"],
      },
    },
  },
  required: ["title", "questions"],
};

const flashcardResponseSchema = {
  type: "OBJECT",
  properties: {
    flashcards: {
      type: "ARRAY",
      description: "An array of up to 8 high-quality study flashcards.",
      items: {
        type: "OBJECT",
        properties: {
          front: {
            type: "STRING",
            description: "Concise front side containing a question, term, or concept.",
          },
          back: {
            type: "STRING",
            description: "Clear back side containing the answer, explanation, or definition.",
          },
        },
        required: ["front", "back"],
      },
    },
  },
  required: ["flashcards"],
};

module.exports = {
  quizResponseSchema,
  flashcardResponseSchema,
};
