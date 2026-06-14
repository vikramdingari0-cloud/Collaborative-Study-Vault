// ============================================
// logger.js — Production-Grade Winston Logger
// ============================================
// Replaces raw console.log with structured, level-based logging.
// In development: colorized console output.
// In production: JSON logs written to files for monitoring.
// ============================================

const { createLogger, format, transports } = require("winston");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

const logger = createLogger({
  level: isProduction ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    isProduction
      ? format.json()
      : format.combine(
          format.colorize(),
          format.printf(({ timestamp, level, message, stack }) => {
            return stack
              ? `${timestamp} ${level}: ${message}\n${stack}`
              : `${timestamp} ${level}: ${message}`;
          })
        )
  ),
  transports: [
    new transports.Console(),
    // In production, also write to log files
    ...(isProduction
      ? [
          new transports.File({
            filename: path.join(__dirname, "../../logs/error.log"),
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new transports.File({
            filename: path.join(__dirname, "../../logs/combined.log"),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

module.exports = logger;
