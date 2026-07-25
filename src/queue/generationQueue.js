const { Queue } = require("bullmq");
const connection = require("./connection");

const generationQueue = new Queue("generation", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

module.exports = generationQueue;
