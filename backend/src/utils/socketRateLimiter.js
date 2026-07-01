// ============================================
// socketRateLimiter.js — Per-Socket Event Rate Limiting
// ============================================
// Guards Socket.IO event handlers against flooding / DoS attacks.
// Uses a simple sliding-window counter per socket+event pair.
// ============================================

const logger = require("./logger");

// Per-socket counters: { socketId → { eventName → { count, windowStart } } }
const counters = new Map();

// Default rules (max events per windowMs)
const DEFAULT_RULES = {
  send_message:   { maxPerWindow: 20,  windowMs: 10_000 }, // 20 messages/10s
  draw_stroke:    { maxPerWindow: 120, windowMs: 1_000  }, // 120 strokes/s
  undo_stroke:    { maxPerWindow: 30,  windowMs: 1_000  },
  clear_whiteboard: { maxPerWindow: 5, windowMs: 10_000 },
  join_workspace_chat:   { maxPerWindow: 10, windowMs: 30_000 },
  join_whiteboard:       { maxPerWindow: 10, windowMs: 30_000 },
  create_thread:  { maxPerWindow: 10,  windowMs: 60_000 }, // 10 threads/min
  create_reply:   { maxPerWindow: 20,  windowMs: 60_000 },
};

/**
 * Middleware factory — attaches a wrapping guard to socket.onAny.
 * Call once in your socket connection handler.
 *
 * @param {Object} socket - Socket.IO socket instance
 */
const applySocketRateLimit = (socket) => {
  const socketId = socket.id;
  counters.set(socketId, {});

  socket.onAny((event, ...args) => {
    const rule = DEFAULT_RULES[event];
    if (!rule) return; // No rule = no limit needed

    const socketCounters = counters.get(socketId);
    if (!socketCounters) return;

    const now = Date.now();
    if (!socketCounters[event]) {
      socketCounters[event] = { count: 0, windowStart: now };
    }

    const entry = socketCounters[event];

    // Reset window if expired
    if (now - entry.windowStart >= rule.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count += 1;

    if (entry.count > rule.maxPerWindow) {
      logger.warn(
        `Socket rate limit exceeded [Socket: ${socketId}] [User: ${socket.user?.name}] [Event: ${event}] [${entry.count}/${rule.maxPerWindow} per ${rule.windowMs}ms]`
      );
      socket.emit("error", {
        message: `Too many '${event}' events. Please slow down.`,
        code: "RATE_LIMITED",
      });
      // Return false to signal the handler should abort — listeners still fire,
      // but we emit error and the caller can check. For hard blocking we'd need
      // socket.removeAllListeners(event) which is too aggressive.
      // The check in each handler: if rate-limited we skip business logic.
      socket._rateLimitedEvents = socket._rateLimitedEvents || new Set();
      socket._rateLimitedEvents.add(event);
      setTimeout(() => socket._rateLimitedEvents?.delete(event), rule.windowMs);
      return;
    }

    // Clear any lingering rate-limit flag
    socket._rateLimitedEvents?.delete(event);
  });

  // Clean up counter map on disconnect
  socket.on("disconnect", () => {
    counters.delete(socketId);
  });
};

/**
 * Guard check — call at the start of each rate-limited event handler.
 * @param {Object} socket
 * @param {string} event
 * @returns {boolean} true if rate limited (caller should return early)
 */
const isRateLimited = (socket, event) => {
  return socket._rateLimitedEvents?.has(event) ?? false;
};

module.exports = { applySocketRateLimit, isRateLimited };
