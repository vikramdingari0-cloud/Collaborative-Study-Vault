// ============================================
// authValidator.js — Input Validation Rules
// ============================================
// WHY THIS EXISTS:
//
// NEVER trust frontend data.
// Users can send anything — empty strings, SQL injection, XSS.
//
// express-validator checks inputs BEFORE they reach controllers.
//
// FLOW:
// Request → Validator (checks input) → Controller (handles logic)
//
// If validation fails:
// → Request is rejected immediately
// → Controller never runs
// → Database is never touched
//
// This is a critical security layer.
// ============================================

const { body, validationResult } = require("express-validator");

// ============================================
// REGISTER VALIDATION RULES
// ============================================
const registerRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(), // Converts to lowercase, removes dots in gmail, etc.

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
];

// ============================================
// LOGIN VALIDATION RULES
// ============================================
const loginRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

// ============================================
// UPDATE PROFILE VALIDATION RULES
// ============================================
const updateProfileRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Bio cannot exceed 200 characters"),

  body("avatar")
    .optional()
    .trim()
    .custom((value) => {
      if (value === "") return true;
      // If provided, it must look like a URL or a Cloudinary asset public ID
      return true;
    }),
];

// ============================================
// CHANGE PASSWORD VALIDATION RULES
// ============================================
const changePasswordRules = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("New password must contain at least one uppercase letter, one lowercase letter, and one number"),
];

// ============================================
// VALIDATION RESULT CHECKER (Middleware)
// ============================================
// This middleware runs AFTER the rules above.
// It checks if any validation errors occurred.
// If yes → returns 400 with error details.
// If no → calls next() to proceed to controller.
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
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  validate,
};
