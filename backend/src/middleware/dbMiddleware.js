const apiResponse = require("../utils/apiResponse");
const connectDB = require("../config/db");

/**
 * Block API writes/reads when MongoDB is not connected (prevents silent save failures).
 */
const requireDb = (req, res, next) => {
  if (!connectDB.isDbConnected()) {
    return apiResponse(
      res,
      503,
      false,
      "Database is not connected. Check MONGO_URI in backend/.env and restart the server."
    );
  }
  next();
};

module.exports = requireDb;
