//publish в Redis
// Notifications must never stall document generation or BullMQ's connection.
const redis = require("../../queue/connection").duplicate({
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  commandTimeout: 2000,
  autoResendUnfulfilledCommands: false,
});
redis.on("error", (error) => {
  console.error("[generation-events] publisher connection:", error.message);
});

const GENERATION_EVENTS_CHANNEL = "generation:events";

const publishGenerationEvent = async (payload) => {
  await redis.publish(GENERATION_EVENTS_CHANNEL, JSON.stringify(payload));
};

module.exports = {
  GENERATION_EVENTS_CHANNEL,
  publishGenerationEvent,
};
