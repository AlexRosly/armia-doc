const { GenerationJob } = require("../../models");

const assertGenerationJobOwnership = async ({ jobId, clientId }) => {
  const job = await GenerationJob.findById(jobId);

  if (!job) {
    const error = new Error("JOB_NOT_FOUND");
    error.statusCode = 404;
    throw error;
  }

  if (job.clientId !== clientId) {
    const error = new Error("FORBIDDEN");
    error.statusCode = 403;
    throw error;
  }

  return job;
};

module.exports = assertGenerationJobOwnership;
