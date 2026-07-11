const { ActProfileCache } = require("../../../models");
const buildActFingerprint = require("./buildActFingerprint");
const buildFingerprintKey = require("./buildFingerprintKey");

const saveCachedActProfile = async (payload, layoutProfile, profile) => {
  const fingerprint = buildActFingerprint(payload, layoutProfile);
  const fingerprintKey = buildFingerprintKey(fingerprint);

  await ActProfileCache.findOneAndUpdate(
    { fingerprintKey },
    {
      $set: {
        fingerprintKey,
        layoutProfile,
        fingerprint,
        profile,
        lastUsedAt: new Date(),
      },
      $inc: {
        hits: 1,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );
};

module.exports = saveCachedActProfile;
