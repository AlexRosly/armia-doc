#!/usr/bin/env node
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const { GenerationJob } = require("../src/models");
const { ensureActiveJobIndex } = require("../src/services/generation/ensureActiveJobIndex");

(async () => {
  await connectDB();
  // Read-only diagnostics: schema metadata, never cookies or document contents.
  try {
    const build = await mongoose.connection.db.admin().command({ buildInfo: 1 });
    console.log(JSON.stringify({ mongoVersion: build.version }));
  } catch (error) {
    console.log(JSON.stringify({ mongoVersionUnavailable: error.codeName || error.code }));
  }
  const indexes = await GenerationJob.collection.listIndexes().toArray().catch(error => {
    if (error.code === 26) return [];
    throw error;
  });
  console.log(JSON.stringify({ indexes: indexes.map(({ name, key, unique, partialFilterExpression }) =>
    ({ name, key, unique, partialFilterExpression })) }, null, 2));
  // Do not output client cookies or document contents.
  const duplicates = await GenerationJob.aggregate([
    { $match: { status: { $in: ["queued", "processing"] } } },
    { $group: { _id: "$clientId", count: { $sum: 1 }, jobs: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { _id: 0, count: 1, jobs: 1 } },
  ]);
  console.log(JSON.stringify({ duplicateGroups: duplicates }, null, 2));
  if (duplicates.length) throw new Error("Resolve duplicate active jobs individually before installing the index; no jobs were changed.");
  if (process.argv.includes("--apply")) {
    await ensureActiveJobIndex();
    console.log("Unique active-generation index is installed.");
  } else console.log("Read-only check complete. Pass --apply to install the index.");
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
