// const mongoose = require("mongoose");
// const createGenerationJob = require("./createGenerationJob");
// const startGeneration = require("./startGeneration");

// const persistAndGenerate = async ({ model, payload }) => {
//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     const [document] = await model.create([payload], { session });

//     const job = await createGenerationJob(document, session);

//     await session.commitTransaction();

//     session.endSession();

//     startGeneration(document, job);

//     return {
//       document,
//       job,
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();

//     throw error;
//   }
// };

// module.exports = persistAndGenerate;
const mongoose = require("mongoose");
const createGenerationJob = require("./createGenerationJob");
const startGeneration = require("./startGeneration");

const persistAndGenerate = async ({
  model,
  payload,
  existingDocument = null,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    let document = existingDocument;

    if (!document) {
      const [createdDocument] = await model.create([payload], { session });
      document = createdDocument;
    }

    const job = await createGenerationJob(document, session);

    await session.commitTransaction();
    session.endSession();

    await startGeneration(document, job);

    return {
      document,
      job,
      reused: Boolean(existingDocument),
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};

module.exports = persistAndGenerate;
