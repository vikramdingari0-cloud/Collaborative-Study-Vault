// ============================================
// authService.js — Authentication Business Logic
// ============================================
// WHY A SERVICE LAYER?
//
// Professional architecture separates:
//   Controller → handles HTTP request/response
//   Service    → handles business logic + database
//
// WITHOUT service layer (beginner approach):
//   Controller does EVERYTHING — messy, untestable
//
// WITH service layer (professional approach):
//   Controller is thin — only calls service methods
//   Service is reusable — can be called from controllers, sockets, jobs
//   Testing is easier — test services independently
//
// This is called "Separation of Concerns"
// One of the most important software engineering principles.
// ============================================

const User = require("../models/User");

/**
 * Create a new user in the database
 * @param {Object} userData - { name, email, password }
 * @returns {Object} Created user (without password)
 */
const createUser = async ({ name, email, password }) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("User with this email already exists");
    error.statusCode = 400;
    throw error;
  }

  // Create user — password is auto-hashed by pre-save hook in User model
  const user = await User.create({
    name,
    email,
    password,
  });

  // Return user data WITHOUT password
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    tokenVersion: user.tokenVersion,
    createdAt: user.createdAt,
  };
};

/**
 * Authenticate user with email and password.
 * Includes brute-force protection: 5 failed attempts → 15-minute lockout.
 * @param {string} email - User's email
 * @param {string} password - User's password (plain text)
 * @returns {Object} Authenticated user data
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = (Number(process.env.LOGIN_LOCKOUT_MINUTES) || 15) * 60 * 1000;

const authenticateUser = async (email, password) => {
  // Include password AND brute-force tracking fields
  const user = await User.findOne({ email }).select("+password +loginAttempts +lockUntil");

  // Generic message — never reveal whether email exists
  const invalidError = Object.assign(new Error("Invalid email or password"), { statusCode: 401 });

  if (!user) throw invalidError;

  // Block system accounts from password-based login
  const SYSTEM_EMAILS = new Set(["ai-tutor@studyvault.com"]);
  if (SYSTEM_EMAILS.has(user.email?.toLowerCase())) throw invalidError;

  // Block guest accounts from password login (they log in via /auth/guest only)
  if (user.isGuest) throw invalidError;

  // Check if account is currently locked
  const isLocked = user.lockUntil && user.lockUntil > new Date();
  if (isLocked) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60_000);
    const lockError = new Error(
      `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`
    );
    lockError.statusCode = 429;
    throw lockError;
  }

  // Compare entered password with stored hash
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    // Increment failed attempt counter
    const newAttempts = (user.loginAttempts || 0) + 1;
    const update = { loginAttempts: newAttempts };

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      update.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      update.loginAttempts = 0; // Reset counter — lock is the signal now
    }

    await User.findByIdAndUpdate(user._id, { $set: update });
    throw invalidError;
  }

  // Successful login — reset brute force counters
  if (user.loginAttempts > 0 || user.lockUntil) {
    await User.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: "" },
    });
  }

  // Return user data WITHOUT sensitive fields
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    tokenVersion: user.tokenVersion,
    createdAt: user.createdAt,
  };
};

/**
 * Get user profile by ID
 * @param {string} userId - MongoDB ObjectId
 * @returns {Object} User profile data
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * Create a guest user for demo purposes
 * Recruiters can test the app without registering
 * @returns {Object} Guest user data
 */
const createGuestUser = async () => {
  // Generate unique guest credentials
  const guestId = Date.now().toString(36);
  const guestEmail = `guest_${guestId}@studyvault.com`;

  const user = await User.create({
    name: `Guest User`,
    email: guestEmail,
    password: `guest_${guestId}_pass`,
    isGuest: true,
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isGuest: true,
    tokenVersion: user.tokenVersion,
    createdAt: user.createdAt,
  };
};

/**
 * Increment token version to invalidate all existing JWTs
 * Used for "logout from all devices" functionality
 * @param {string} userId - MongoDB ObjectId
 */
const incrementTokenVersion = async (userId) => {
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};

/**
 * Update user profile details
 * @param {string} userId
 * @param {Object} fields - { name, bio, avatar }
 * @returns {Object} Updated user document
 */
const updateUserProfile = async (userId, { name, bio, avatar }) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (user.isGuest) {
    const error = new Error("Guest profile details cannot be modified");
    error.statusCode = 403;
    throw error;
  }

  if (name) {
    user.name = name.trim();
  }
  if (bio !== undefined) {
    user.bio = bio.trim().slice(0, 200);
  }
  if (avatar !== undefined) {
    user.avatar = avatar;
  }

  await user.save();
  return user;
};

/**
 * Change user password
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (user.isGuest) {
    const error = new Error("Guest users cannot change their password");
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || newPassword.length < 8) {
    const error = new Error("New password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  user.tokenVersion += 1; // Force log out other active sessions
  await user.save();
};

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  createGuestUser,
  incrementTokenVersion,
  updateUserProfile,
  changeUserPassword,
};
