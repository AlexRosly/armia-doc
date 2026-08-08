const { GenerationJob } = require("../../models");
const { ACTIVE_GENERATION_JOB_STATUSES } = require("./constants");

const findActiveGenerationJobByClientId = async (clientId, session = null) => {
  const query = GenerationJob.findOne({
    clientId,
    status: { $in: ACTIVE_GENERATION_JOB_STATUSES },
  }).sort({ createdAt: -1 });

  if (session) {
    query.session(session);
  }

  return query;
};

module.exports = findActiveGenerationJobByClientId;
