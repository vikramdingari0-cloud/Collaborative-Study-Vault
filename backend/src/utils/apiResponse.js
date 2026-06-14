// ============================================
// apiResponse.js — Standardized API Response
// ============================================
// WHY THIS EXISTS:
// Without this, every controller writes its own response format.
// That creates inconsistency. Recruiters notice this immediately.
//
// WITH THIS:
// Every API response looks the same:
// { success: true/false, message: "...", data: {...} }
//
// This is how production SaaS APIs work.
// ============================================

/**
 * Send a standardized JSON response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (200, 201, 400, 401, 404, 500)
 * @param {boolean} success - Whether the request succeeded
 * @param {string} message - Human-readable message
 * @param {Object|null} data - Response payload (optional)
 * @param {Object|null} _unused - Reserved for future use
 * @param {Object|null} meta - Pagination or other metadata (optional)
 */
const apiResponse = (res, statusCode, success, message, data = null, _unused = null, meta = null) => {
  const response = {
    success,
    message,
  };

  // Only include data field if data exists
  // This keeps responses clean when there's no data to return
  if (data !== null) {
    response.data = data;
  }

  // Include metadata (pagination, etc.) if provided
  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

module.exports = apiResponse;
