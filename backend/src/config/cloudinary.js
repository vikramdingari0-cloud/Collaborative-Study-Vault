// ============================================
// cloudinary.js — Cloudinary SDK Configuration
// ============================================
// Configures Cloudinary connection for secure, remote file hosting.
// Gracefully handles missing credentials so that the server doesn't crash.
// ============================================

const cloudinary = require("cloudinary").v2;
const logger = require("../utils/logger");

const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info("☁️ Cloudinary configured successfully.");
} else {
  logger.warn(
    "☁️ Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing. File uploads will be disabled."
  );
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
