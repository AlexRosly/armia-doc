const crypto = require("crypto");

const buildFingerprintKey = (fingerprint) =>
  crypto.createHash("sha256").update(JSON.stringify(fingerprint)).digest("hex");

module.exports = buildFingerprintKey;
