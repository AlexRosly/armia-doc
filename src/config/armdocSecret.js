const crypto = require("crypto");

const secret = process.env.ARMDOC_SECRET;

if (!secret) {
  throw new Error("ARMDOC_SECRET is missing. Please set it in .env");
}

if (!/^[0-9a-fA-F]{64}$/.test(secret)) {
  throw new Error("ARMDOC_SECRET must contain exactly 64 hex characters.");
}

module.exports = Buffer.from(secret, "hex");
