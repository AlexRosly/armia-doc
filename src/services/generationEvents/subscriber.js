// subscribe из Redis и fanout в локальные SSE-клиенты
const IORedis = require("ioredis");
const { sendToJobClients } = require("./registry");
const { GENERATION_EVENTS_CHANNEL } = require("./publisher");

let subscriber = null;
let started = false;

const createSubscriber = () =>
  new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
  });

const startGenerationEventsSubscriber = async () => {
  if (started) return;

  subscriber = createSubscriber();

  subscriber.on("connect", () => {
    console.log("[generation-events] redis subscriber connected");
  });

  subscriber.on("error", (error) => {
    console.error("[generation-events] redis subscriber error:", error.message);
  });

  subscriber.on("message", (channel, message) => {
    if (channel !== GENERATION_EVENTS_CHANNEL) return;

    try {
      const payload = JSON.parse(message);
      if (!payload?.jobId) return;

      sendToJobClients(String(payload.jobId), payload, "status");
    } catch (error) {
      console.error(
        "[generation-events] failed to process redis event:",
        error.message,
      );
    }
  });

  await subscriber.subscribe(GENERATION_EVENTS_CHANNEL);
  started = true;

  console.log(
    `[generation-events] subscribed to channel=${GENERATION_EVENTS_CHANNEL}`,
  );
};

module.exports = {
  startGenerationEventsSubscriber,
};
