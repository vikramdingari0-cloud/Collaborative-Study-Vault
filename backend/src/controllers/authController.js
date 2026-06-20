// ============================================
// authController.js — Authentication Request Handlers
// ============================================
// Controllers are the THIN LAYER between routes and services.
//
// WHAT CONTROLLERS DO:
// 1. Extract data from request (req.body, req.params)
// 2. Call the appropriate service method
// 3. Send the response
//
// WHAT CONTROLLERS DO NOT DO:
// ❌ Database queries (that's the service's job)
// ❌ Business logic (that's the service's job)
// ❌ Input validation (that's the validator's job)
//
// This keeps controllers clean and focused.
// ============================================

const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const generateToken = require("../utils/generateToken");
const authService = require("../services/authService");

const clearAuthCookie = (res) => {
res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    expires: new Date(0),
});
};

// ============================================
// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
// ============================================
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Service handles: duplicate check + user creation + password hashing
  const user = await authService.createUser({ name, email, password });

  // Generate JWT and set HTTP-only cookie
  generateToken(res, user._id, user.tokenVersion || 0);

  // Send success response
  apiResponse(res, 201, true, "Registration successful", user);
});

// ============================================
// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
// ============================================
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Service handles: find user + compare password
  const user = await authService.authenticateUser(email, password);

  // Generate JWT and set HTTP-only cookie (includes tokenVersion for revocation)
  generateToken(res, user._id, user.tokenVersion || 0);

  apiResponse(res, 200, true, "Login successful", user);
});

// ============================================
// @desc    Logout user (clear cookie)
// @route   POST /api/v1/auth/logout
// @access  Private
// ============================================
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  apiResponse(res, 200, true, "Logged out successfully");
});

// ============================================
// @desc    Get current user profile
// @route   GET /api/v1/auth/profile
// @access  Private
// ============================================
const getProfile = asyncHandler(async (req, res) => {
  // req.user is set by authMiddleware after JWT verification
  const user = await authService.getUserById(req.user._id);

  apiResponse(res, 200, true, "Profile retrieved", user);
});

// ============================================
// @desc    Guest demo login (1-click for recruiters)
// @route   POST /api/v1/auth/guest
// @access  Public
// ============================================
const guestLogin = asyncHandler(async (req, res) => {
  // Create temporary guest account
  const guest = await authService.createGuestUser();

  // Generate JWT cookie
  generateToken(res, guest._id, guest.tokenVersion || 0);

  apiResponse(res, 201, true, "Guest login successful", guest);
});

// ============================================
// @desc    Refresh JWT token (extends session)
// @route   POST /api/v1/auth/refresh
// @access  Private
// ============================================
const refreshToken = asyncHandler(async (req, res) => {
  // Re-issue a fresh token with the current tokenVersion
  const user = req.user;
  generateToken(res, user._id, user.tokenVersion);

  apiResponse(res, 200, true, "Token refreshed");
});

// ============================================
// @desc    Force logout from all devices
// @route   POST /api/v1/auth/logout-all
// @access  Private
// ============================================
const logoutAllDevices = asyncHandler(async (req, res) => {
  // Increment tokenVersion to invalidate ALL existing tokens
  await authService.incrementTokenVersion(req.user._id);

  clearAuthCookie(res);
  apiResponse(res, 200, true, "Logged out from all devices");
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
  guestLogin,
  refreshToken,
  logoutAllDevices,
};
