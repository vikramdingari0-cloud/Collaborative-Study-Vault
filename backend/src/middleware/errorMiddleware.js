// ============================================
// errorMiddleware.js — Global Error Handler
// ============================================
// WHY THIS EXISTS:
//
// This is the CENTRAL error handler for the entire backend.
// Every error from every controller flows here.
//
// WITHOUT this:
// - Server crashes on unhandled errors
// - Inconsistent error responses
// - Impossible debugging in production
//
// WITH this:
// - All errors are caught
// - Clean JSON responses
// - Stack traces shown in development (for debugging)
// - Stack traces HIDDEN in production (for security)
//
// HOW IT WORKS:
// Express recognizes error middleware by having 4 parameters:
// (err, req, res, next)
// Regular middleware has 3: (req, res, next)
// ============================================

/**
 * Global error handler middleware
 * Catches all errors and returns standardized JSON response
 *
 * @param {Error} err - The error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const logger = require("../utils/logger");

const errorMiddleware = (err, req, res, next) => {
  // Respect the error status code if specified by the thrown error, otherwise fall back to response status or 500
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;

  // ---- Handle specific MongoDB/Mongoose errors ----

  // Bad ObjectId (e.g., /api/v1/users/invalidid)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found — invalid ID format";
  }

  // Duplicate key error (e.g., email already exists)
  if (err.code === 11000) {
    statusCode = 400;
    message = `Duplicate value entered for: ${Object.keys(err.keyValue).join(", ")}`;
  }

  // Validation error (e.g., required field missing)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token — authorization denied";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired — please login again";
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error(`${statusCode} ${req.method} ${req.originalUrl} — ${message}`, { stack: err.stack });
  } else {
    logger.warn(`${statusCode} ${req.method} ${req.originalUrl} — ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Show stack trace only in development (security best practice)
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorMiddleware;
