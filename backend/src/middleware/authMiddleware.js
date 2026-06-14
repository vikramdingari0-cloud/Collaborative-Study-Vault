// ============================================
// authMiddleware.js — JWT Protection Middleware
// ============================================
// THIS IS THE GATEKEEPER OF YOUR ENTIRE API.
//
// HOW IT WORKS:
// 1. Client sends request with JWT cookie
// 2. This middleware extracts the token from the cookie
// 3. Verifies the token using JWT_SECRET
// 4. Finds the user in database
// 5. Attaches user to req.user
// 6. Calls next() → controller runs
//
// If token is missing or invalid:
// → Request is REJECTED with 401 Unauthorized
// → Controller NEVER runs
//
// USAGE IN ROUTES:
//   router.get("/profile", protect, getProfile);
//   // protect runs first → if valid → getProfile runs
//
// ROLE-BASED ACCESS:
//   router.delete("/admin", protect, authorize("admin"), deleteUser);
//   // First checks JWT → then checks if user is admin
// ============================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// ============================================
// PROTECT — Verify JWT token
// ============================================
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Read token from HTTP-only cookie
  token = req.cookies.jwt;

  if (!token) {
    res.status(401);
    throw new Error("Not authorized — no token provided");
  }

  try {
    // Verify token — jwt.verify() throws if token is invalid/expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by decoded ID, exclude password
    req.user = await User.findById(decoded.userId).select("-password");

    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized — user not found");
    }

    // Check token version — if it has been incremented, all old tokens are revoked
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== req.user.tokenVersion) {
      res.status(401);
      throw new Error("Not authorized — token has been revoked");
    }

    next(); // Token valid, user found → proceed to controller
  } catch (error) {
    res.status(401);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      throw new Error("Not authorized — please sign in again");
    }
    throw new Error("Not authorized — invalid token");
  }
});

// ============================================
// AUTHORIZE — Role-based access control
// ============================================
// Usage: authorize("admin", "university")
// Only allows users with specified roles
//
// This runs AFTER protect middleware.
// req.user is already available.
// ============================================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role '${req.user.role}' is not authorized to access this resource`
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
