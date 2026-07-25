const IORedis = require("ioredis");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

connection.on("connect", () => {
  console.log("[redis] connected");
});

connection.on("error", (error) => {
  console.error("[redis] error:", error.message);
});

module.exports = connection;
