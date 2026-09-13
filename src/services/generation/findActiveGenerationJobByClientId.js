const { GenerationJob } = require("../../models");
const { ACTIVE_GENERATION_JOB_STATUSES } = require("./constants");

const recoverInterruptedGenerationJob = require("./recoverInterruptedGenerationJob");

const findActiveGenerationJobByClientId = async (clientId, session = null) => {
  const query = GenerationJob.findOne({
    clientId,
    status: { $in: ACTIVE_GENERATION_JOB_STATUSES },
  }).sort({ createdAt: -1 });

  if (session) {
    query.session(session);
  }

  const job = await query;
  // No recovery writes inside the create transaction: its snapshot could be stale.
  if (session || !job) return job;
  const current = await recoverInterruptedGenerationJob(job);
  if (!current || !ACTIVE_GENERATION_JOB_STATUSES.includes(current.status)) {
    return findActiveGenerationJobByClientId(clientId);
  }
  return current;
};

module.exports = findActiveGenerationJobByClientId;
