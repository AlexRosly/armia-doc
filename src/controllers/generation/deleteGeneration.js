const { GenerationJob } = require("../../models");
const assertOwnership = require("../../services/generation/assertGenerationJobOwnership");
module.exports = async (req, res, next) => {
  try {
    const job = await assertOwnership({ jobId: req.params.jobId, clientId: req.clientId });
    if (job.lifecycleManaged) {
      await GenerationJob.updateOne({ _id: job._id }, { $set: { cancelRequestedAt: new Date(), cancelReason: "explicit_close" } });
      require("../../services/generation/lifecycle/supervisor").interrupt(String(job._id));
      return res.status(202).json({ accepted: true });
    }
    if (["queued", "processing"].includes(job.status)) {
      return res.status(409).json({ error: "LEGACY_GENERATION_ACTIVE", message: "Попередня генерація ще виконується." });
    }
    await require("../../services/generation/deleteGenerationJob")(String(job._id));
    return res.json({ success: true });
  } catch (error) { error.status ||= error.statusCode; next(error); }
};
