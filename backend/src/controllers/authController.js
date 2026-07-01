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

const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const generateToken = require("../utils/generateToken");
const authService = require("../services/authService");

const clearAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    expires: new Date(0),
  });
  
  // Clear refresh token cookie on logout
  res.cookie("jwt_refresh", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/v1/auth/refresh",
    expires: new Date(0),
  });
  
  // Clear CSRF cookie on logout
  res.cookie("XSRF-TOKEN", "", {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
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
  const refreshTokenValue = req.cookies.jwt_refresh;
  if (!refreshTokenValue) {
    res.status(401);
    throw new Error("Session expired — please sign in again");
  }

  try {
    const decoded = jwt.verify(refreshTokenValue, process.env.JWT_SECRET);
    if (decoded.type !== "refresh") {
      res.status(401);
      throw new Error("Invalid session token type");
    }

    const user = await authService.getUserById(decoded.userId);
    if (decoded.tokenVersion !== user.tokenVersion) {
      res.status(401);
      throw new Error("Session revoked — please sign in again");
    }

    // Generate fresh Access + Refresh pair
    generateToken(res, user._id, user.tokenVersion);

    apiResponse(res, 200, true, "Session extended successfully");
  } catch (err) {
    // Clear cookies if invalid
    clearAuthCookie(res);
    res.status(401);
    throw new Error("Invalid or expired session — please sign in again");
  }
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

// ============================================
// @desc    Update user profile details
// @route   PUT /api/v1/auth/profile
// @access  Private
// ============================================
const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, avatar } = req.body;
  const updatedUser = await authService.updateUserProfile(req.user._id, {
    name,
    bio,
    avatar,
  });

  apiResponse(res, 200, true, "Profile updated successfully", {
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    avatar: updatedUser.avatar,
    bio: updatedUser.bio,
    createdAt: updatedUser.createdAt,
  });
});

// ============================================
// @desc    Change current user password
// @route   PUT /api/v1/auth/change-password
// @access  Private
// ============================================
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changeUserPassword(req.user._id, currentPassword, newPassword);

  // Note: Changing password rotates tokenVersion which invalidates existing session.
  // We issue a fresh JWT cookie to keep the current session authenticated.
  generateToken(res, req.user._id, req.user.tokenVersion + 1);

  apiResponse(res, 200, true, "Password changed successfully on this device. Session updated.");
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
  guestLogin,
  refreshToken,
  logoutAllDevices,
  updateProfile,
  changePassword,
};
