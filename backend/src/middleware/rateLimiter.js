// ============================================
// rateLimiter.js — API Rate Limiting Middleware
// ============================================
// Prevents abuse by limiting the number of requests
// a single IP can make within a time window.
// ============================================

const rateLimit = require("express-rate-limit");

// General API rate limiter — 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// Strict limiter for auth routes — 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login/register attempts. Please try again after 15 minutes.",
  },
});

// AI routes limiter — 30 requests per 15 minutes (API calls are expensive)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many AI requests. Please try again after 15 minutes.",
  },
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
