const dns = require("dns");

/**
 * Node on Windows often gets querySrv ECONNREFUSED while system tools (nslookup) work.
 * Use MONGO_DNS_SERVERS in .env to override, or reliable public resolvers for Atlas SRV.
 */
const configureMongoDns = (mongoUri) => {
  if (!mongoUri?.includes("mongodb+srv://")) {
    return;
  }

  const fromEnv = process.env.MONGO_DNS_SERVERS?.trim();
  if (fromEnv) {
    dns.setServers(
      fromEnv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    return;
  }

  if (process.platform === "win32") {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  }
};

module.exports = { configureMongoDns };
