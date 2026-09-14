const { fork } = require("child_process");
const path = require("path");
const { randomUUID } = require("crypto");
const { GenerationJob } = require("../../../models");
const { createExecutionOwner } = require("../inlineExecutionOwner");
const { killGroup } = require("./processTree");
const running = new Map();
const interrupt = id => running.get(id)?.();
async function launch(job) {
  if (process.platform !== "linux") throw new Error("Managed execution requires Linux");
  const id = String(job._id), launchId = randomUUID();
  const owner = await createExecutionOwner({ forceInline: true });
  const claimed = await GenerationJob.findOneAndUpdate({
    _id: job._id, lifecycleManaged: true, cancelRequestedAt: null,
    "execution.launchId": { $exists: false }, status: { $in: ["queued", "processing"] },
  }, { $set: { execution: { ...owner, supervised: true, launchId }, executorStoppedAt: null } }, { returnDocument: "after" });
  if (!claimed) return;
  return new Promise((resolve, reject) => {
    let child, interval, stopping = false, checking = false, finished = false;
    const stop = () => {
      if (stopping || !child?.pid) return;
      stopping = true;
      try { killGroup(child.pid); } catch (error) { stopping = false; console.error("[managed-generation] stop failed", error.code); }
    };
    try {
      child = fork(path.join(__dirname, "child.js"), [], {
        detached: true, stdio: ["ignore", "inherit", "inherit", "ipc"],
        env: { ...process.env, QUEUE_ENABLED: "false" },
      });
    } catch (error) {
      void GenerationJob.updateOne({ _id: job._id, "execution.launchId": launchId }, {
        $set: { executorStoppedAt: new Date(), status: "failed" },
      }).then(() => require("./cleanup").cleanJob(job._id)).then(() => reject(error), reject);
      return;
    }
    running.set(id, stop);
    child.on("message", message => { if (message?.type === "done") stop(); });
    const finish = async () => {
      if (finished) return;
      finished = true;
      clearInterval(interval); running.delete(id);
      try {
        // Kill any remaining descendants even when the child exited unexpectedly.
        if (child.pid) killGroup(child.pid);
        await GenerationJob.updateOne({ _id: job._id, "execution.launchId": launchId }, {
          $set: { executorStoppedAt: new Date() },
        });
        await GenerationJob.updateOne({ _id: job._id, "execution.launchId": launchId,
          status: { $in: ["queued", "processing"] } }, {
          $set: { status: "failed", error: "Генерацію перервано або скасовано." },
        });
        await require("./cleanup").cleanJob(job._id);
        resolve();
      } catch (error) { reject(error); }
    };
    child.on("exit", finish);
    child.on("error", () => { if (!child.pid) void finish(); else stop(); });
    // Server-side execution bound only; never based on browser connectivity.
    const configured = Number(process.env.GENERATION_MAX_RUNTIME_MS || 0);
    const deadline = Number.isFinite(configured) && configured > 0 ? Date.now() + configured : Infinity;
    interval = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const current = await GenerationJob.findById(job._id);
        if (!current || current.cancelRequestedAt) stop();
        else if (Date.now() >= deadline) {
          await GenerationJob.updateOne({ _id: job._id }, {
            $set: { cancelRequestedAt: new Date(), cancelReason: "execution_timeout" },
          });
          stop();
        }
      } catch { /* DB recovery/cleanup will reconcile; do not assume cancellation. */ }
      finally { checking = false; }
    }, 1000);
    child.send({ type: "start", jobId: id, launchId }, error => { if (error) stop(); });
  });
}
// Keep the previous single-conversion concurrency per API/worker process.
// Pending jobs stay in Mongo and can be cancelled before they get a process.
let serial = Promise.resolve();
const scheduled = new Map();
function enqueue(job) {
  const id = String(job._id);
  if (scheduled.has(id)) return scheduled.get(id);
  const task = serial.then(() => launch(job)).finally(() => scheduled.delete(id));
  scheduled.set(id, task);
  serial = task.catch(() => {});
  return task;
}
module.exports = { launch: enqueue, interrupt };
