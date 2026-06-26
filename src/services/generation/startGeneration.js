const runGenerationJob = require("./runGenerationJob");

const startGeneration = (document, job) => {
  setImmediate(async () => {
    try {
      await runGenerationJob(document, job);
    } catch (error) {
      console.error(error);
    }
  });
};

module.exports = startGeneration;
