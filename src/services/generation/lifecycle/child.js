// The supervisor passes identifiers via IPC, never payloads through argv/logs.
const fs = require("fs/promises");
const path = require("path");
const { pathToFileURL } = require("url");
const stopOwnGroup = () => {
  // This child is always forked detached on Linux; kill LibreOffice descendants too.
  try { process.kill(-process.pid, "SIGKILL"); } catch { process.exit(1); }
};
process.on("disconnect", stopOwnGroup);
process.on("SIGTERM", stopOwnGroup);
let started = false;
process.on("message", async message => {
  if (started || message?.type !== "start") return;
  started = true;
  try {
    const connectDB = require("../../../config/db");
    const { GenerationJob, documentModels } = require("../../../models");
    const { createExecutionOwner } = require("../inlineExecutionOwner");
    await connectDB();
    const execution = await createExecutionOwner();
    const job = await GenerationJob.findOneAndUpdate({
      _id: message.jobId, lifecycleManaged: true, cancelRequestedAt: null,
      "execution.launchId": message.launchId, status: { $in: ["queued", "processing"] },
    }, { $set: { execution: { ...execution, supervised: true, launchId: message.launchId } } }, { returnDocument: "after" });
    if (!job) return process.send({ type: "done" });
    const root = require("../storageRoot")(job);
    for (const dir of ["docx", "pdf", "armdoc", "tmp", "lo-profile"]) {
      await fs.mkdir(path.join(root, dir), { recursive: true });
    }
    process.env.GENERATION_STORAGE_ROOT = root;
    process.env.TMPDIR = path.join(root, "tmp");
    process.env.TMP = process.env.TMPDIR;
    process.env.TEMP = process.env.TMPDIR;
    process.env.GENERATION_LO_PROFILE = pathToFileURL(path.join(root, "lo-profile")).href;
    const document = await documentModels[job.documentType].findById(job.documentId);
    if (!document) throw new Error("Generation source not found");
    await require("../runGenerationJob")(document, job);
  } catch (error) {
    // Parent persists a generic failure; do not send input-bearing errors over IPC.
    console.error("[managed-generation] execution failed:", error.code || error.name);
  } finally {
    if (process.connected) process.send({ type: "done" });
    else stopOwnGroup();
  }
});
