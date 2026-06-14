/**
 * Normalize MongoDB Atlas connection strings.
 * Fixes common mistakes: missing database name, trailing slashes.
 */
const DEFAULT_DB_NAME = "collaborative-study-vault";

const normalizeMongoUri = (uri) => {
  if (!uri || typeof uri !== "string") {
    return uri;
  }

  const trimmed = uri.trim();

  // mongodb+srv://user:pass@host/?params → inject db name
  const srvMissingDb = trimmed.match(/^(mongodb\+srv:\/\/[^/]+)\/?(\?.*)?$/);
  if (srvMissingDb) {
    const base = srvMissingDb[1];
    const params = srvMissingDb[2] || "";
    const sep = params ? (params.startsWith("?") ? "" : "?") : "?";
    const query = params || "?retryWrites=true&w=majority";
    const normalizedQuery = query.includes("retryWrites")
      ? query
      : `${query}${query.includes("?") ? "&" : "?"}retryWrites=true&w=majority`;
    return `${base}/${DEFAULT_DB_NAME}${normalizedQuery}`;
  }

  // mongodb+srv://user:pass@host/ → add db name
  if (/^mongodb(\+srv)?:\/\/[^/]+\/?$/.test(trimmed)) {
    return `${trimmed.replace(/\/?$/, "")}/${DEFAULT_DB_NAME}?retryWrites=true&w=majority`;
  }

  return trimmed;
};

module.exports = { normalizeMongoUri, DEFAULT_DB_NAME };
