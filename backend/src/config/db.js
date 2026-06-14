const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { normalizeMongoUri, DEFAULT_DB_NAME } = require("./mongoUri");
const { configureMongoDns } = require("./mongoDns");

/**
 * Connect to MongoDB (local or Atlas). Server must await this before accepting traffic.
 */
const connectDB = async () => {
  const rawUri = process.env.MONGO_URI;
  const uri = normalizeMongoUri(rawUri);

  if (rawUri !== uri) {
    logger.warn(
      `MONGO_URI was missing a database name — using "${DEFAULT_DB_NAME}". Update backend/.env to include it explicitly.`
    );
  }

  if (!uri || uri.trim() === "") {
    logger.error("MONGO_URI is missing. Add it to backend/.env (see .env.example for Atlas format).");
    process.exit(1);
  }

  const isLocal =
    uri.includes("127.0.0.1") ||
    uri.includes("localhost") ||
    uri.startsWith("mongodb://127.");

  configureMongoDns(uri);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      // Auto-reconnect settings for production resilience
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
    logger.info(`Database name: ${conn.connection.name}`);

    if (isLocal) {
      logger.warn(
        "Using local MongoDB. If notes are not saving, install/start MongoDB locally or switch MONGO_URI to MongoDB Atlas in backend/.env"
      );
    }

    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);

    if (isLocal) {
      logger.error(
        "Local MongoDB is not reachable. Either start MongoDB on your machine, or use MongoDB Atlas — see README.md section 'MongoDB Atlas'."
      );
    } else if (uri.startsWith("mongodb+srv://")) {
      if (error.message?.includes("querySrv") || error.message?.includes("ECONNREFUSED")) {
        logger.error(
          'DNS blocked Node SRV lookup. Add to backend/.env: MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1 then restart. Or use Atlas "Standard connection string" (mongodb:// not mongodb+srv://).'
        );
      } else {
        logger.error(
          "Atlas tips: (1) Whitelist your IP in Atlas → Network Access, (2) URL-encode special characters in your password, (3) Include a database name in the URI, e.g. ...mongodb.net/collaborative-study-vault"
        );
      }
    }

    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected — saves will fail until reconnected.");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected successfully.");
});

mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});

// Enable Mongoose auto-reconnect with backoff
mongoose.set("autoIndex", process.env.NODE_ENV !== "production");

/**
 * @returns {boolean} True when Mongoose is connected and ready for reads/writes
 */
const isDbConnected = () => mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;
