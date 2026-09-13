const { GenerationJob } = require("../../models");
const NAME = "one_active_generation_per_client";
const OPTIONS = {
  name: NAME,
  unique: true,
  partialFilterExpression: {
    // Historical jobs without a clientId do not belong to a browser session.
    // New requests require a non-empty string before creating any records.
    clientId: { $type: "string" },
    status: { $in: ["queued", "processing"] },
  },
};
let pending;
const ensureActiveJobIndex = () => {
  if (!pending) {
    pending = Promise.resolve().then(() => GenerationJob.collection.createIndex({ clientId: 1 }, OPTIONS))
      .catch(error => { pending = undefined; throw error; });
  }
  return pending;
};
module.exports = { ensureActiveJobIndex, NAME, OPTIONS };
