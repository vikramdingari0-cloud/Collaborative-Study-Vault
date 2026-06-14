// ============================================
// asyncHandler.js — Async Error Wrapper
// ============================================
// WHY THIS EXISTS:
//
// WITHOUT this utility, every controller needs:
//
//   const getUser = async (req, res) => {
//     try {
//       const user = await User.findById(req.params.id);
//       res.json(user);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   };
//
// That means writing try/catch in EVERY controller.
// That's repetitive and messy.
//
// WITH this utility:
//
//   const getUser = asyncHandler(async (req, res) => {
//     const user = await User.findById(req.params.id);
//     res.json(user);
//   });
//
// If ANY error happens, it automatically goes to errorMiddleware.
// Clean code. Professional pattern. Zero repetition.
// ============================================

/**
 * Wraps an async function and catches any errors,
 * forwarding them to Express error middleware via next()
 *
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
