const { GenerationJob } = require("../../models");
const { isInlineOwnerStopped } = require("./inlineExecutionOwner");
const { ACTIVE_GENERATION_JOB_STATUSES } = require("./constants");

const recoverInterruptedGenerationJob = async (job) => {
  if (!job || job.lifecycleManaged || !ACTIVE_GENERATION_JOB_STATUSES.includes(job.status) ||
      !job.execution?.instanceId || !(await isInlineOwnerStopped(job.execution))) return job;

  const updated = await GenerationJob.findOneAndUpdate(
    {
      _id: job._id,
      status: { $in: ACTIVE_GENERATION_JOB_STATUSES },
      "execution.instanceId": job.execution.instanceId,
    },
    { $set: {
      status: "failed",
      error: "Генерацію перервано через зупинку процесу сервера. Створіть документ повторно.",
    } },
    { returnDocument: "after" },
  );
  if (updated) console.warn(`[generation] recovered stopped inline owner job=${job._id}`);
  return updated || await GenerationJob.findById(job._id);
};

module.exports = recoverInterruptedGenerationJob;
