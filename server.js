require("dotenv").config();
const app = require("./src/app");
const { logger } = require("./src/utils");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 7070;

connectDB()
  .then(() => {
    // Existing status/download routes stay available if admission is unavailable.
    require("./src/services/generation/ensureActiveJobIndex").ensureActiveJobIndex()
      .catch(err => logger.error({ err }, "Generation admission unavailable; new jobs are blocked"));
    require("./src/services/generation/lifecycle/cleanup").start();
    app.listen(PORT, () => {
      logger.info("Server started on port " + PORT);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start");
    process.exit(1);
  });
