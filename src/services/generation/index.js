const runGenerationJob = require("./runGenerationJob");
const createGenerationJob = require("./createGenerationJob");
const startGeneration = require("./startGeneration");
const persistAndGenerate = require("./persistAndGenerate");
const deleteGenerationJob = require("./deleteGenerationJob");
const findActiveGenerationJobByClientId = require("./findActiveGenerationJobByClientId");
const assertGenerationJobOwnership = require("./assertGenerationJobOwnership");
const buildGenerationJobPayload = require("./buildGenerationJobPayload");
// const detectDetachedSignature = require("./detectDetachedSignature");
const evaluateReportProshuPlacement = require("./evaluateReportProshuPlacement");

module.exports = {
  runGenerationJob,
  createGenerationJob,
  startGeneration,
  persistAndGenerate,
  deleteGenerationJob,
  findActiveGenerationJobByClientId,
  assertGenerationJobOwnership,
  buildGenerationJobPayload,
  evaluateReportProshuPlacement,
  // detectDetachedSignature,
};
