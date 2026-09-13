#!/usr/bin/env node
// Read-only by default. Never deletes source documents or generation files.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const { GenerationJob } = require("../src/models");
const { isInlineOwnerStopped } = require("../src/services/generation/inlineExecutionOwner");

const main = async () => {
  const [jobId, ...flags] = process.argv.slice(2);
  if (!/^[a-f0-9]{24}$/i.test(jobId || "")) {
    throw new Error("Usage: node scripts/recover-generation-job.js JOB_ID [--apply --confirm-no-live-executor --expected-updated-at ISO_DATE]");
  }
  await connectDB();
  const job = await GenerationJob.findById(jobId);
  if (!job) throw new Error("JOB_NOT_FOUND");
  console.log(JSON.stringify({
    jobId: String(job._id), documentType: job.documentType,
    status: job.status, createdAt: job.createdAt, updatedAt: job.updatedAt,
    executionKind: job.execution?.kind || "legacy-unknown",
    files: job.files,
  }, null, 2));
  if (!flags.includes("--apply")) return;
  if (!flags.includes("--confirm-no-live-executor")) {
    throw new Error("First verify that no API/worker or child process is still executing this job. Then pass --confirm-no-live-executor.");
  }
  const index = flags.indexOf("--expected-updated-at");
  const expected = index >= 0 ? new Date(flags[index + 1]) : new Date(NaN);
  if (!Number.isFinite(expected.getTime()) || expected.getTime() !== job.updatedAt?.getTime()) {
    throw new Error("Expected updatedAt must exactly match the dry-run snapshot; inspect the job again.");
  }
  if (!["queued", "processing"].includes(job.status)) throw new Error("JOB_NOT_ACTIVE");
  if (job.execution?.kind === "queue") {
    throw new Error("Queue-managed job: reconcile BullMQ first; this tool only handles legacy or confirmed stopped inline jobs.");
  }
  if (job.execution?.kind === "inline" && !(await isInlineOwnerStopped(job.execution))) {
    throw new Error("Cannot confirm the recorded inline owner has stopped; refusing recovery.");
  }
  const updated = await GenerationJob.findOneAndUpdate(
    { _id: jobId, status: job.status, updatedAt: expected },
    { $set: { status: "failed", error: "Попередню генерацію перервано. Стан перевірено адміністратором; створіть документ повторно." } },
    { returnDocument: "after" },
  );
  if (!updated) throw new Error("Job changed during recovery; nothing was updated.");
  console.log(`Recovered job=${jobId} status=failed; source data and files were not deleted.`);
};
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
