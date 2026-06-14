// ============================================
// env.js — Environment Variable Validation
// ============================================
// Validates all required environment variables at startup.
// The server will NOT start if critical variables are missing.
// ============================================

const logger = require("../utils/logger");

const requiredVars = ["MONGO_URI", "JWT_SECRET"];

const validateEnv = () => {
  const missing = requiredVars.filter((v) => !process.env[v] || process.env[v].trim() === "");

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(", ")}. Add them to backend/.env (see .env.example).`
    );
    process.exit(1);
  }

  // Warn about weak JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (
    jwtSecret === "CHANGE_ME_TO_A_STRONG_RANDOM_STRING" ||
    jwtSecret === "change_in_production" ||
    jwtSecret.length < 32
  ) {
    logger.warn(
      "JWT_SECRET appears to be a default or weak value. Generate a strong 64+ character secret for production."
    );
  }

  // Warn about missing NODE_ENV
  if (!process.env.NODE_ENV) {
    logger.warn('NODE_ENV is not set. Defaulting to "development".');
    process.env.NODE_ENV = "development";
  }

  if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL?.trim()) {
    logger.error("FRONTEND_URL is required when NODE_ENV=production");
    process.exit(1);
  }

  // Warn about missing GEMINI_API_KEY
  if (!process.env.GEMINI_API_KEY) {
    logger.warn(
      "GEMINI_API_KEY is not set. AI features will use the local Mock Engine instead of Gemini."
    );
  }

  logger.info("Environment variables validated successfully.");
};

module.exports = validateEnv;