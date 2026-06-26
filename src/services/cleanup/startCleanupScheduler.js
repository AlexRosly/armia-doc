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

const cleanupExpiredJobs = require("./cleanupExpiredJobs");
const startCleanupScheduler = () => {
  cleanupExpiredJobs();

  setInterval(async () => {
    try {
      await cleanupExpiredJobs();
    } catch (error) {
      console.error("Cleanup error", error);
    }
  }, 60 * 1000);
};

module.exports = startCleanupScheduler;
