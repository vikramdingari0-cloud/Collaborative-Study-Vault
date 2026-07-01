// ============================================
// generateToken.js — JWT Token Utility
// ============================================
// WHY THIS EXISTS:
//
// JWT (JSON Web Token) is the industry standard for
// stateless authentication in REST APIs.
//
// FLOW:
// 1. User logs in successfully
// 2. Server creates a JWT containing the user's ID
// 3. JWT is stored in an HTTP-only cookie (NOT localStorage!)
// 4. Every future request sends this cookie automatically
// 5. Server verifies the JWT to identify the user
//
// WHY HTTP-ONLY COOKIES?
// - localStorage is vulnerable to XSS attacks
// - HTTP-only cookies CANNOT be read by JavaScript
// - This is the production security standard
//
// JWT STRUCTURE:
// header.payload.signature
// - Header: algorithm info
// - Payload: user data (we store userId)
// - Signature: server's secret key verification
// ============================================

const jwt = require("jsonwebtoken");
const { rotateCsrfToken } = require("../middleware/csrfMiddleware");

/**
 * Generate JWT and set it as an HTTP-only cookie
 * Includes tokenVersion for revocation — if user.tokenVersion changes,
 * all previously issued tokens become invalid.
 *
 * @param {Object} res - Express response object
 * @param {string} userId - MongoDB user _id
 * @param {number} tokenVersion - User's current token version
 * @returns {string} The generated JWT token
 */
const generateToken = (res, userId, tokenVersion = 0) => {
  // 1. Generate Access Token (expires in 15 minutes)
  const accessToken = jwt.sign(
    { userId, tokenVersion, type: "access" }, // include type to prevent reuse
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  // 2. Generate Refresh Token (expires in 7 days)
  const refreshToken = jwt.sign(
    { userId, tokenVersion, type: "refresh" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const isProd = process.env.NODE_ENV === "production";

  // Set Access Token cookie
  res.cookie("jwt", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Set Refresh Token cookie (scoped to refresh route)
  res.cookie("jwt_refresh", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/v1/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Automatically rotate/issue a fresh CSRF token
  rotateCsrfToken(res);

  return accessToken;
};

module.exports = generateToken;
