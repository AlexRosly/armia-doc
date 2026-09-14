const fs = require("fs/promises");
const { GenerationJob, documentModels } = require("../../../models");
const Request = require("../../../models/generationRequest");
const storageRoot = require("../storageRoot");
const { isInlineOwnerStopped } = require("../inlineExecutionOwner");
const { groupExists } = require("./processTree");
async function executorStopped(job) {
  if (job.executorStoppedAt) return true;
  if (!job.execution?.launchId) return true; // queued, never claimed by a supervisor
  if (!(await isInlineOwnerStopped(job.execution))) return false;
  // A dead leader with live descendants is NOT safe to clean.
  return !groupExists(job.execution.pid);
}
async function cleanJob(id) {
  const job = await GenerationJob.findById(id);
  if (!job?.lifecycleManaged) return false;
  const expired = job.status === "ready" && job.expiresAt <= new Date();
  if (!job.cancelRequestedAt && job.status !== "failed" && !expired) return false;
  if (!(await executorStopped(job))) return false;
  await fs.rm(storageRoot(job), { recursive: true, force: true });
  const Model = documentModels[job.documentType];
  // Imported source documents may still be referenced by another job.
  if (Model && !(await GenerationJob.exists({ documentId: job.documentId, _id: { $ne: job._id } }))) {
    await Model.deleteOne({ _id: job.documentId });
  }
  // Keep a short-lived content-free cancellation marker against delayed create.
  await Request.updateMany({ jobId: job._id }, { $set: { closedAt: new Date(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, $unset: { clientId: "", jobId: "" } });
  await GenerationJob.deleteOne({ _id: job._id, lifecycleManaged: true });
  return true;
}
let timer;
function start() {
  if (timer) return timer;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      for await (const job of GenerationJob.find({ lifecycleManaged: true }).cursor()) {
        const abandonedQueue = !job.execution?.launchId && job.status === "queued" &&
          await isInlineOwnerStopped(job.execution);
        if (abandonedQueue || (!job.executorStoppedAt && job.execution?.launchId && await executorStopped(job))) {
          await GenerationJob.updateOne({ _id: job._id, cancelRequestedAt: null,
            "execution.instanceId": job.execution?.instanceId,
            "execution.launchId": job.execution?.launchId || { $exists: false },
          }, {
            $set: { executorStoppedAt: new Date(), cancelRequestedAt: new Date(), cancelReason: "executor_lost" },
          });
        }
        // Durable browser-close markers are reconciled even if the API died
        // between receiving close and updating the generation record.
        if (!job.cancelRequestedAt && await Request.exists({ jobId: job._id, closedAt: { $ne: null } }) &&
            !(await Request.exists({ jobId: job._id, closedAt: null }))) {
          await GenerationJob.updateOne({ _id: job._id }, { $set: { cancelRequestedAt: new Date(), cancelReason: "page_left" } });
        }
        if (!abandonedQueue && job.status === "queued" && !job.execution?.launchId &&
            job.execution?.kind === "inline" && !job.cancelRequestedAt) {
          void require("./supervisor").launch(job).catch(() => {});
        }
        await cleanJob(job._id);
      }
    } catch (error) { console.error("[generation-cleanup] retry pending:", error.code || error.name); }
    finally { busy = false; }
  };
  timer = setInterval(tick, 1000);
  timer.unref();
  void tick();
  return timer;
}
module.exports = { start, cleanJob, executorStopped };
