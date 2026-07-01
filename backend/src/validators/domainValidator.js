// ============================================
// domainValidator.js — General Domain Input Validators
// ============================================
// Security-first layer: validating user-supplied metadata for notes,
// forum threads/replies, quizzes, files, and past papers.
// ============================================

const { body, query, validationResult } = require("express-validator");

// ============================================
// NOTES VALIDATION RULES
// ============================================
const createNoteRules = [
  body("workspaceId")
    .trim()
    .notEmpty()
    .withMessage("workspaceId is required")
    .isMongoId()
    .withMessage("workspaceId must be a valid Mongo ID"),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("content")
    .optional()
    .isLength({ max: 100000 })
    .withMessage("Content cannot exceed 100,000 characters"),

  body("folderId")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isMongoId()
    .withMessage("folderId must be a valid Mongo ID if provided"),
];

const updateNoteRules = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty if provided")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("content")
    .optional()
    .isLength({ max: 100000 })
    .withMessage("Content cannot exceed 100,000 characters"),

  body("folderId")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isMongoId()
    .withMessage("folderId must be a valid Mongo ID if provided"),
];

const searchNoteRules = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query 'q' parameter is required")
    .isLength({ max: 100 })
    .withMessage("Search query cannot exceed 100 characters"),
];

// ============================================
// FORUM VALIDATION RULES
// ============================================
const createThreadRules = [
  body("workspaceId")
    .trim()
    .notEmpty()
    .withMessage("workspaceId is required")
    .isMongoId()
    .withMessage("workspaceId must be a valid Mongo ID"),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 10, max: 10000 })
    .withMessage("Content must be between 10 and 10,000 characters"),
];

const createReplyRules = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Reply content is required")
    .isLength({ min: 2, max: 5000 })
    .withMessage("Reply must be between 2 and 5,000 characters"),
];

// ============================================
// QUIZ VALIDATION RULES
// ============================================
const generateQuizRules = [
  body("noteId")
    .trim()
    .notEmpty()
    .withMessage("noteId is required")
    .isMongoId()
    .withMessage("noteId must be a valid Mongo ID"),

  body("difficulty")
    .optional()
    .trim()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Difficulty must be easy, medium, or hard"),
];

const submitAttemptRules = [
  body("correctAnswers")
    .optional()
    .isInt({ min: 0 })
    .withMessage("correctAnswers must be a non-negative integer"),

  body("score")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("score must be a non-negative number"),
];

// ============================================
// FILE VALIDATION RULES
// ============================================
const uploadFileRules = [
  body("workspaceId")
    .trim()
    .notEmpty()
    .withMessage("workspaceId is required")
    .isMongoId()
    .withMessage("workspaceId must be a valid Mongo ID"),

  body("folderId")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isMongoId()
    .withMessage("folderId must be a valid Mongo ID if provided"),
];

// ============================================
// PAST PAPER VALIDATION RULES
// ============================================
const createPastPaperRules = [
  body("workspaceId")
    .trim()
    .notEmpty()
    .withMessage("workspaceId is required")
    .isMongoId()
    .withMessage("workspaceId must be a valid Mongo ID"),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Title must be between 2 and 200 characters"),

  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Subject must be between 2 and 100 characters"),

  body("year")
    .trim()
    .notEmpty()
    .withMessage("Year is required")
    .isInt({ min: 1900, max: 2100 })
    .withMessage("Year must be a valid integer between 1900 and 2100"),
];

// ============================================
// VALIDATION MIDDLEWARE EXECUTION
// ============================================
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

module.exports = {
  createNoteRules,
  updateNoteRules,
  searchNoteRules,
  createThreadRules,
  createReplyRules,
  generateQuizRules,
  submitAttemptRules,
  uploadFileRules,
  createPastPaperRules,
  validate,
};
