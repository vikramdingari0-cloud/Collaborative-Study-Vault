// ============================================
// csrfMiddleware.js — CSRF Protection Middleware
// ============================================
// Implements the Double-Submit Cookie pattern for CSRF protection.
// 
// How it works:
// 1. On safe requests (GET, HEAD, OPTIONS), if the 'XSRF-TOKEN' cookie is missing,
//    the server generates a random token and sets it as a non-HttpOnly cookie.
// 2. The frontend (e.g. Axios) reads this cookie and sends it back in the 'X-XSRF-TOKEN' header.
// 3. On state-changing requests (POST, PUT, DELETE, PATCH), this middleware compares
//    the value in the cookie with the value in the header. If they don't match,
//    the request is rejected with a 403 Forbidden.
// ============================================

const crypto = require("crypto");
const logger = require("../utils/logger");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Generate a cryptographically secure random token
 * @returns {string}
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Set the XSRF-TOKEN cookie on the response
 * @param {Object} res - Express response
 * @param {string} token - The token value
 */
const setCsrfCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  
  // Note: httpOnly MUST be false so client-side JavaScript can read this cookie
  // and include it in the request headers (e.g. X-XSRF-TOKEN).
  res.cookie("XSRF-TOKEN", token, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
};

/**
 * CSRF Protection Middleware
 */
const csrfProtection = (req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";
  
  // Skip CSRF validation for login and register (anonymous endpoints)
  if (req.path === '/api/v1/auth/login' || req.path === '/api/v1/auth/register') {
    return next();
  }

  const cookieToken = req.cookies["XSRF-TOKEN"];

  // 1. If it's a safe method, ensure a CSRF token exists
  if (SAFE_METHODS.has(req.method)) {
    if (!cookieToken) {
      const newToken = generateCsrfToken();
      setCsrfCookie(res, newToken);
      req.csrfTokenStr = newToken;
    } else {
      req.csrfTokenStr = cookieToken;
    }
    return next();
  }

  // 2. For state-changing methods, validate the token
  const headerToken = req.headers["x-xsrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.warn(`CSRF validation failed [Method: ${req.method}] [URL: ${req.originalUrl}] [IP: ${req.ip}]`);
    
    const error = new Error("CSRF token validation failed or token missing.");
    error.statusCode = 403;
    return next(error);
  }

  next();
};

/**
 * Helper to rotate/regenerate CSRF token (e.g., on login, register, logout)
 * @param {Object} res - Express response
 */
const rotateCsrfToken = (res) => {
  const newToken = generateCsrfToken();
  setCsrfCookie(res, newToken);
};

module.exports = {
  csrfProtection,
  rotateCsrfToken,
};
