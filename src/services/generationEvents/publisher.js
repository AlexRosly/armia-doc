//publish в Redis
const redis = require("../../queue/connection");

const GENERATION_EVENTS_CHANNEL = "generation:events";

const publishGenerationEvent = async (payload) => {
  await redis.publish(GENERATION_EVENTS_CHANNEL, JSON.stringify(payload));
};

module.exports = {
  GENERATION_EVENTS_CHANNEL,
  publishGenerationEvent,
};
