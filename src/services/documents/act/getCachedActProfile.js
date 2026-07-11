const { ActProfileCache } = require("../../../models");
const buildActFingerprint = require("./buildActFingerprint");
const buildFingerprintKey = require("./buildFingerprintKey");

const getCachedActProfile = async (payload, layoutProfile) => {
  const fingerprint = buildActFingerprint(payload, layoutProfile);
  const fingerprintKey = buildFingerprintKey(fingerprint);

  const cached = await ActProfileCache.findOne({ fingerprintKey }).lean();

  return cached?.profile || null;
};

module.exports = getCachedActProfile;
