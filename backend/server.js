// ============================================
// server.js — Main Application Entry Point
// ============================================
// This is the HEART of your backend.
//
// EXECUTION ORDER MATTERS:
// 1. Load environment variables (.env)
// 2. Import dependencies
// 3. Connect to MongoDB
// 4. Create Express app
// 5. Register global middleware (cors, json, cookies)
// 6. Register API routes
// 7. Register error handlers (MUST be LAST)
// 8. Start server
//
// WHY THIS ORDER?
// - .env must load FIRST (other files need env vars)
// - MongoDB connects BEFORE routes (routes need DB)
// - Error handlers go LAST (they catch errors from routes)
//
// MIDDLEWARE ORDER:
// cors → json → cookies → routes → 404 → error handler
// ============================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const crypto = require("crypto");
require("dotenv").config();

// ---- Import configurations ----
const connectDB = require("./src/config/db");
const validateEnv = require("./src/config/env");
const requireDb = require("./src/middleware/dbMiddleware");

// ---- Import middleware ----
const notFoundMiddleware = require("./src/middleware/notFoundMiddleware");
const errorMiddleware = require("./src/middleware/errorMiddleware");
const { apiLimiter, authLimiter, aiLimiter } = require("./src/middleware/rateLimiter");

// ---- Import utilities ----
const logger = require("./src/utils/logger");

const http = require("http");
const socketIO = require("./src/config/socket");

// ---- Import routes ----
const authRoutes = require("./src/routes/authRoutes");
const workspaceRoutes = require("./src/routes/workspaceRoutes");
const folderRoutes = require("./src/routes/folderRoutes");
const noteRoutes = require("./src/routes/noteRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const quizRoutes = require("./src/routes/quizRoutes");
const fileRoutes = require("./src/routes/fileRoutes");
const pastPaperRoutes = require("./src/routes/pastPaperRoutes");
const forumRoutes = require("./src/routes/forumRoutes");
const { startCleanupJob } = require("./src/jobs/cleanupJob");
const sendHealthCheck = require("./src/utils/healthCheck");

// ============================================
// CREATE EXPRESS APPLICATION
// ============================================
const app = express();
app.set("trust proxy", 1);

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Security headers (XSS protection, clickjacking prevention, MIME sniffing, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: [
  "'self'",
  "https://collaborative-study-vault-1.onrender.com",
  "https://collaborative-study-vault-kzjt.onrender.com",
  "wss:",
  "ws:"
],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Assign unique request ID for distributed tracing and log correlation
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.id = requestId;
  res.set("X-Request-Id", requestId);
  next();
});

// Compress HTTP responses (gzip)
app.use(compression());

// Enable CORS (Cross-Origin Resource Sharing)
// In production: only allow FRONTEND_URL. In dev: allow all localhost ports.
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

// Add deployed frontend URL to allowed origins
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // In production, require origin and only allow FRONTEND_URL
      if (process.env.NODE_ENV === "production") {
  const allowedOrigins = [
    process.env.FRONTEND_URL?.replace(/\/$/, ""),
    "https://collaborative-study-vault-1.onrender.com"
  ];

  const requestOrigin = origin?.replace(/\/$/, "");

  if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
    return callback(null, true);
  }

  logger.warn(`CORS blocked request from origin: ${origin}`);
  return callback(new Error("Not allowed by CORS"));
}
      // In development, allow localhost origins
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (!origin || allowedOrigins.includes(origin) || isLocalhost) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true, // IMPORTANT: allows cookies to be sent cross-origin
  })
);

// Global API rate limiter (skip health probe)
app.use("/api/", (req, res, next) => {
  if (req.path === "/health") return next();
  return apiLimiter(req, res, next);
});

// Parse JSON request bodies
// Without this, req.body is undefined
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Parse cookies from incoming requests
// Without this, req.cookies is undefined (JWT won't work!)
app.use(cookieParser());

// ============================================
// API ROUTES
// ============================================

// Health check — use /api/health (works in dev + production)
app.get("/api/health", sendHealthCheck);
app.get("/health", sendHealthCheck);

// Dev-only: root also returns JSON (production serves React app at /)
if (process.env.NODE_ENV !== "production") {
  app.get("/", sendHealthCheck);
}

// All API routes require an active MongoDB connection
app.use("/api/v1", requireDb);

// Auth routes → /api/v1/auth/* (stricter rate limit)
app.use("/api/v1/auth", authLimiter, authRoutes);

// Workspace routes → /api/v1/workspaces/*
app.use("/api/v1/workspaces", workspaceRoutes);

// Folder routes → /api/v1/folders/*
app.use("/api/v1/folders", folderRoutes);

// Note routes → /api/v1/notes/*
app.use("/api/v1/notes", noteRoutes);

// File routes → /api/v1/files/*
app.use("/api/v1/files", fileRoutes);

// Past paper routes → /api/v1/pastpapers/*
app.use("/api/v1/pastpapers", pastPaperRoutes);

// Forum routes → /api/v1/forum/*
app.use("/api/v1/forum", forumRoutes);

// Chat routes → /api/v1/chats/*
app.use("/api/v1/chats", chatRoutes);

// AI routes → /api/v1/ai/* (stricter rate limit for expensive AI calls)
app.use("/api/v1/ai", aiLimiter, aiRoutes);

// Quiz routes → /api/v1/quizzes/* (stricter rate limit for AI generation)
app.use("/api/v1/quizzes", aiLimiter, quizRoutes);

// Serve static assets in production (SPA at /, health stays at /api/health)
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  const distPath = path.join(__dirname, "../frontend/dist");

  app.use(express.static(distPath));

  // SPA fallback — never override /api/* routes
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// ============================================
// ERROR HANDLING (MUST BE LAST)
// ============================================
// Order matters:
// 1. notFoundMiddleware catches unmatched routes → creates 404 error
// 2. errorMiddleware catches ALL errors → sends clean JSON response
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ============================================
// START SERVER (after MongoDB is connected)
// ============================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  validateEnv();
  await connectDB();

  const server = http.createServer(app);
  socketIO.init(server);

  startCleanupJob();

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  });

  process.on("unhandledRejection", (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
    server.close(() => process.exit(1));
  });

  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
};

startServer().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
