// ============================================
// authRoutes.js — Authentication API Endpoints
// ============================================
// This file CONNECTS:
//   URL paths → validators → controllers
//
// ROUTE STRUCTURE:
//   POST /api/v1/auth/register  → public  → create account
//   POST /api/v1/auth/login     → public  → login
//   POST /api/v1/auth/logout    → private → logout
//   GET  /api/v1/auth/profile   → private → get current user
//   POST /api/v1/auth/guest     → public  → 1-click demo login
//
// MIDDLEWARE CHAIN (for register):
//   registerRules → validate → register controller
//   1. Check input  2. Verify  3. Execute
//
// WHY THIS ORDER MATTERS:
// If validation fails at step 1, controller never runs.
// This saves database queries and prevents bad data.
// ============================================

const express = require("express");
const router = express.Router();

// Import controllers
const {
  register,
  login,
  logout,
  getProfile,
  guestLogin,
  refreshToken,
  logoutAllDevices,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

// Import validators
const {
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  validate,
} = require("../validators/authValidator");

// Import auth middleware
const { protect } = require("../middleware/authMiddleware");

// ============================================
// PUBLIC ROUTES (no JWT required)
// ============================================

// Register new user
// POST /api/v1/auth/register
// Body: { name, email, password }
router.post("/register", registerRules, validate, register);

// Login user
// POST /api/v1/auth/login
// Body: { email, password }
router.post("/login", loginRules, validate, login);

// Guest demo login (1-click access for recruiters/demo)
router.post("/guest", guestLogin);
// ============================================
// PRIVATE ROUTES (JWT required)
// ============================================

// Logout user
// POST /api/v1/auth/logout
router.post("/logout", protect, logout);

// Refresh JWT token (extends session)
// POST /api/v1/auth/refresh
router.post("/refresh", refreshToken);

// Force logout from all devices (invalidates all existing tokens)
// POST /api/v1/auth/logout-all
router.post("/logout-all", protect, logoutAllDevices);

// Get current user profile
// GET /api/v1/auth/profile
router.get("/profile", protect, getProfile);

// Update current user profile
// PUT /api/v1/auth/profile
router.put("/profile", protect, updateProfileRules, validate, updateProfile);

// Change current user password
// PUT /api/v1/auth/change-password
router.put("/change-password", protect, changePasswordRules, validate, changePassword);

module.exports = router;
