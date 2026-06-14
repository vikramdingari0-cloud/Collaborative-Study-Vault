// ============================================
// workspaceValidator.js — Workspace Input Validation
// ============================================
// Security-first layer: NEVER trust client input.
// This validates workspace title, description, and member roles before reaching controllers.
// ============================================

const { body, validationResult } = require("express-validator");

// ============================================
// CREATE WORKSPACE RULES
// ============================================
const createWorkspaceRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Workspace title is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("color")
    .optional()
    .trim()
    .isHexColor()
    .withMessage("Color must be a valid hex color code"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Icon/Emoji identifier cannot exceed 20 characters"),

  body("visibility")
    .optional()
    .trim()
    .isIn(["private", "public", "shared"])
    .withMessage("Visibility must be private, public, or shared"),
];

// ============================================
// UPDATE WORKSPACE RULES
// ============================================
const updateWorkspaceRules = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Workspace title cannot be empty if provided")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("color")
    .optional()
    .trim()
    .isHexColor()
    .withMessage("Color must be a valid hex color code"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Icon/Emoji identifier cannot exceed 20 characters"),

  body("visibility")
    .optional()
    .trim()
    .isIn(["private", "public", "shared"])
    .withMessage("Visibility must be private, public, or shared"),
];

// ============================================
// JOIN WORKSPACE BY CODE RULES
// ============================================
const joinWorkspaceRules = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Workspace join code is required")
    .isLength({ min: 4, max: 10 })
    .withMessage("Join code must be between 4 and 10 characters"),
];

// ============================================
// ADD MEMBER RULES
// ============================================
const addMemberRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("role")
    .optional()
    .trim()
    .isIn(["viewer", "editor", "admin"])
    .withMessage("Role must be viewer, editor, or admin"),
];

// ============================================
// UPDATE MEMBER ROLE RULES
// ============================================
const updateMemberRoleRules = [
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["viewer", "editor", "admin"])
    .withMessage("Role must be viewer, editor, or admin"),
];

// ============================================
// VALIDATION RESULT CHECKER (Middleware)
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
  createWorkspaceRules,
  updateWorkspaceRules,
  joinWorkspaceRules,
  addMemberRules,
  updateMemberRoleRules,
  validate,
};
