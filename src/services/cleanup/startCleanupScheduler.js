// const cleanupExpiredJobs = require("./cleanupExpiredJobs");

// const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

// const startCleanupScheduler = () => {
//   let isRunning = false;

//   const runCleanup = async () => {
//     if (isRunning) {
//       console.warn(
//         "[cleanupScheduler] previous cleanup is still running, skipping tick",
//       );
//       return;
//     }

//     isRunning = true;

//     try {
//       await cleanupExpiredJobs();
//       await cleanupOrphanFiles();
//     } catch (error) {
//       console.error("[cleanupScheduler] cleanup error:", error);
//     } finally {
//       isRunning = false;
//     }
//   };

//   runCleanup();

//   const intervalId = setInterval(runCleanup, CLEANUP_INTERVAL_MS);

//   return intervalId;
// };

// module.exports = startCleanupScheduler;
const cleanupExpiredJobs = require("./cleanupExpiredJobs");
const cleanupOrphanFiles = require("./cleanupOrphanFiles");

const { GenerationJob } = require("../../models");
const recoverInterruptedGenerationJob = require("../generation/recoverInterruptedGenerationJob");

const CLEANUP_INTERVAL_MS = Number(
  process.env.CLEANUP_INTERVAL_MS || 10 * 60 * 1000,
);

const startCleanupScheduler = () => {
  let isRunning = false;

  const runCleanup = async () => {
    if (isRunning) {
      console.warn(
        "[cleanupScheduler] previous cleanup is still running, skipping tick",
      );
      return;
    }

    isRunning = true;

    try {
      console.log(
        `[cleanupScheduler] tick started at ${new Date().toISOString()}`,
      );

      for await (const job of GenerationJob.find({
        status: { $in: ["queued", "processing"] },
        "execution.kind": "inline",
      }).cursor()) {
        await recoverInterruptedGenerationJob(job);
      }
      await cleanupExpiredJobs();
      await cleanupOrphanFiles();

      console.log(
        `[cleanupScheduler] tick finished at ${new Date().toISOString()}`,
      );
    } catch (error) {
      console.error("[cleanupScheduler] cleanup error:");
      console.error(error);
    } finally {
      isRunning = false;
    }
  };

  console.log(`[cleanupScheduler] started, interval=${CLEANUP_INTERVAL_MS}ms`);

  runCleanup();

  const intervalId = setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  return intervalId;
};

module.exports = startCleanupScheduler;
