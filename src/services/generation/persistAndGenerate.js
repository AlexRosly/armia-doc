const mongoose = require("mongoose");

// const { createGenerationJob, startGeneration } = require("./");
const createGenerationJob = require("./createGenerationJob");
const startGeneration = require("./startGeneration");

const persistAndGenerate = async ({ model, payload }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const [document] = await model.create([payload], { session });

    const job = await createGenerationJob(document, session);

    await session.commitTransaction();

    session.endSession();

    startGeneration(document, job);

    return {
      document,
      job,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};

module.exports = persistAndGenerate;
