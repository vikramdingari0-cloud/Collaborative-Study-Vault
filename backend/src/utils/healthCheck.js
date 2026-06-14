const mongoose = require("mongoose");

/**
 * JSON health payload for load balancers and manual checks.
 */
const sendHealthCheck = (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected
      ? "Collaborative Study Vault API Running"
      : "API up but database not connected — fix MONGO_URI in backend/.env",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    database: {
      connected: dbConnected,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
  });
};

module.exports = sendHealthCheck;
