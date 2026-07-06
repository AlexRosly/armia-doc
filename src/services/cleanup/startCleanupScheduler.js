// const cleanupExpiredJobs = require("./cleanupExpiredJobs");

// const startCleanupScheduler = () => {
//   setInterval(async () => {
//     try {
//       await cleanupExpiredJobs();
//     } catch (error) {
//       console.error("Cleanup error", error);
//     }
//   }, 60 * 1000);
// };

// module.exports = startCleanupScheduler;

// const cleanupExpiredJobs = require("./cleanupExpiredJobs");
// const startCleanupScheduler = () => {
//   cleanupExpiredJobs();

//   setInterval(async () => {
//     try {
//       await cleanupExpiredJobs();
//     } catch (error) {
//       console.error("Cleanup error", error);
//     }
//   }, 60 * 1000);
// };

// module.exports = startCleanupScheduler;
const cleanupExpiredJobs = require("./cleanupExpiredJobs");

const CLEANUP_INTERVAL_MS = 1 * 60 * 1000;

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
      await cleanupExpiredJobs();
    } catch (error) {
      console.error("[cleanupScheduler] cleanup error:", error);
    } finally {
      isRunning = false;
    }
  };

  runCleanup();

  const intervalId = setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  return intervalId;
};

module.exports = startCleanupScheduler;
