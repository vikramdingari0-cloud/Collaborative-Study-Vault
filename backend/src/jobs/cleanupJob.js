// ============================================
// cleanupJob.js — Automated Database Housekeeping
// ============================================
// Periodically scans MongoDB to identify expired guest accounts (created > 24 hours ago).
// Executes deep recursive cleanup on all matching records—deleting guest folders, notes,
// workspaces, and finally the user documents to keep our storage footprint clean
// and production-safe.
// ============================================

const User = require("../models/User");
const Workspace = require("../models/Workspace");
const workspaceService = require("../services/workspaceService");
const logger = require("../utils/logger");

/**
 * Execute a deep recursive cleanup of expired guest accounts
 */
const runGuestCleanup = async () => {
  logger.info("🧹 [Housekeeping] Commencing expired guest accounts database scan...");

  try {
    // 24 hours ago threshold
    const expirationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find guests older than 24 hours
    const expiredGuests = await User.find({
      isGuest: true,
      createdAt: { $lt: expirationThreshold },
    });

    if (expiredGuests.length === 0) {
      logger.info("🧹 [Housekeeping] No expired guest accounts found. Database is clean.");
      return;
    }

    logger.info(`🧹 [Housekeeping] Found ${expiredGuests.length} expired guest account(s). Commencing deep recursive deletions...`);

    for (const guest of expiredGuests) {
      logger.info(`🧹 [Deleting Guest] ${guest.name} (${guest.email}) [ID: ${guest._id}]`);

      // 1. Find all workspaces owned by this guest
      const guestWorkspaces = await Workspace.find({ owner: guest._id });

      for (const workspace of guestWorkspaces) {
        logger.info(`   └─ 🗑️ Recursively deleting Workspace: "${workspace.title}" [ID: ${workspace._id}]`);
        try {
          // Utilizing workspaceService to clear all nested notes, folders, and references
          await workspaceService.deleteWorkspace(workspace._id, guest._id);
        } catch (err) {
          logger.error(`   └─ ❌ Failed to delete workspace ${workspace._id}: ${err.message}`, { stack: err.stack });
        }
      }

      // 2. Finally, delete the guest user document itself
      await User.findByIdAndDelete(guest._id);
      logger.info(`   └─ ✅ Guest user document completely removed.`);
    }

    logger.info("🧹 [Housekeeping] deep cleanup completed successfully! 🎉");
  } catch (error) {
    logger.error("🧹 [Housekeeping] ❌ Automated cleanup failed:", error);
  }
};

/**
 * Initialize and start the background cleanup daemon
 */
const startCleanupJob = () => {
  // Run immediately on backend start
  runGuestCleanup();

  // Execute hourly (3,600,000 milliseconds)
  const hourlyInterval = 60 * 60 * 1000;
  setInterval(runGuestCleanup, hourlyInterval);

  logger.info("🧹 [Housekeeping] Guest account cleanup daemon initialized. Running hourly.");
};

module.exports = {
  startCleanupJob,
  runGuestCleanup, // Exported for manual integration testing
};
