const cleanupExpiredJobs = require("./cleanupExpiredJobs");

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

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
