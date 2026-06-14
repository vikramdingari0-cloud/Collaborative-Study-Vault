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
 * Authenticate user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password (plain text)
 * @returns {Object} Authenticated user data
 */
const authenticateUser = async (email, password) => {
  // Find user AND include password field (which is excluded by default)
  // We need the password to compare with the entered one
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Compare entered password with stored hash
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

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

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  createGuestUser,
  incrementTokenVersion,
};
