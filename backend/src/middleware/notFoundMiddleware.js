// ============================================
// notFoundMiddleware.js — 404 Route Handler
// ============================================
// WHY THIS EXISTS:
//
// Without this, if someone visits:
//   GET /api/v1/randomgarbage
//
// Express returns an ugly HTML error page.
// That looks unprofessional.
//
// WITH this middleware:
// They get a clean JSON response:
// { success: false, message: "Route Not Found - /api/v1/randomgarbage" }
//
// This middleware runs AFTER all routes.
// If no route matched, this catches the request.
// ============================================

/**
 * Catch requests to non-existent routes
 * Creates a 404 error and passes it to errorMiddleware
 */
const notFoundMiddleware = (req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Forward to errorMiddleware
};

module.exports = notFoundMiddleware;
