const runGenerationJob = require("./runGenerationJob");
const createGenerationJob = require("./createGenerationJob");
const startGeneration = require("./startGeneration");
const persistAndGenerate = require("./persistAndGenerate");
const deleteGenerationJob = require("./deleteGenerationJob");

module.exports = {
  runGenerationJob,
  createGenerationJob,
  startGeneration,
  persistAndGenerate,
  deleteGenerationJob,
};
