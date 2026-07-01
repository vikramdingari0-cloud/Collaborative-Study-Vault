// ============================================
// socket.js — Socket.IO Server Configuration
// ============================================
// Core realtime orchestrator. Connects Express HTTP Server to Socket.IO,
// configures secure CORS headers, authenticates connections via JWT,
// and routes socket connection events to individual domain handlers.
// ============================================

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const chatSocket = require("../sockets/chatSocket");
const presenceSocket = require("../sockets/presenceSocket");
const workspaceSocket = require("../sockets/workspaceSocket");
const whiteboardSocket = require("../sockets/whiteboardSocket");
const logger = require("../utils/logger");
const { applySocketRateLimit } = require("../utils/socketRateLimiter");


let io;

/**
 * Initialize Socket.IO server bound to the main HTTP server
 * @param {Object} server - HTTP Server instance
 * @returns {Object} Socket.IO server instance
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176"
];

/**
 * Authenticate socket connection using JWT from handshake
 */
const authenticateSocket = async (socket, next) => {
  try {
    // HTTP-only JWT cookie is sent automatically with withCredentials (not readable from JS)
    const token = socket.handshake.headers?.cookie?.match(/jwt=([^;]+)/)?.[1];

    if (!token) {
      return next(new Error("Authentication required — sign in again"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return next(new Error("User not found"));
    }

    if (
      decoded.tokenVersion !== undefined &&
      decoded.tokenVersion !== user.tokenVersion
    ) {
      return next(new Error("Session expired — please sign in again"));
    }

    socket.user = user;
    next();
  } catch (err) {
    logger.warn(`Socket auth failed: ${err.message}`);
    next(new Error("Invalid or expired session"));
  }
};

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Require origin in production
        if (process.env.NODE_ENV === "production") {
          const productionAllowed = [];
          if (process.env.FRONTEND_URL) {
            productionAllowed.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
          }
          const requestOrigin = origin?.replace(/\/$/, "");
          if (!requestOrigin || productionAllowed.includes(requestOrigin)) {
            return callback(null, true);
          }
          logger.warn(`Socket CORS blocked: ${origin}`);
          return callback(null, false);
        }
        // In development, allow localhost and configured origins
        if (!origin) return callback(null, true);
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        const isEnvFrontend = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL;
        if (allowedOrigins.includes(origin) || isLocalhost || isEnvFrontend) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Authenticate all incoming socket connections
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    logger.info(`🔌 Realtime client connected [Socket ID: ${socket.id}] [User: ${socket.user?.name}]`);

    // Apply per-socket, per-event rate limiting (DoS protection)
    applySocketRateLimit(socket);

    // Attach domain-specific socket handlers
    chatSocket(io, socket);
    presenceSocket(io, socket);
    workspaceSocket(io, socket);
    whiteboardSocket(io, socket);

    socket.on("disconnect", () => {
      logger.info(`🔌 Realtime client disconnected [Socket ID: ${socket.id}]`);
    });
  });

  return io;
};

/**
 * Retrieve active Socket.IO server instance
 * @returns {Object}
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized!");
  }
  return io;
};

module.exports = {
  init,
  getIO,
};
