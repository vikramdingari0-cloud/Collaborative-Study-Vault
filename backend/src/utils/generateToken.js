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
  // Create the token
  // jwt.sign(payload, secret, options)
  const token = jwt.sign(
    { userId, tokenVersion }, // Payload — includes version for revocation
    process.env.JWT_SECRET, // Secret — used to verify token authenticity
    { expiresIn: "24h" } // Options — access token expires in 24 hours
  );

  // Set token as HTTP-only cookie
  const isProd = process.env.NODE_ENV === "production";

res.cookie("jwt", token, {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000,
});

  return token;
};

module.exports = generateToken;
