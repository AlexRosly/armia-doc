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
// const mongoose = require("mongoose");
// const createGenerationJob = require("./createGenerationJob");
// const startGeneration = require("./startGeneration");

// const persistAndGenerate = async ({
//   model,
//   payload,
//   existingDocument = null,
// }) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     let document = existingDocument;

//     if (!document) {
//       const [createdDocument] = await model.create([payload], { session });
//       document = createdDocument;
//     }

//     const job = await createGenerationJob(document, session);

//     await session.commitTransaction();
//     session.endSession();

//     await startGeneration(document, job);

//     return {
//       document,
//       job,
//       reused: Boolean(existingDocument),
//     };
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();

//     throw error;
//   }
// };

// module.exports = persistAndGenerate;
// const mongoose = require("mongoose");
// const createGenerationJob = require("./createGenerationJob");
// const startGeneration = require("./startGeneration");
// const { GenerationJob } = require("../../models");

// const persistAndGenerate = async ({
//   model,
//   payload,
//   existingDocument = null,
// }) => {
//   const session = await mongoose.startSession();

//   let document;
//   let job;
//   let committed = false;

//   try {
//     session.startTransaction();

//     document = existingDocument;

//     if (!document) {
//       const [createdDocument] = await model.create([payload], { session });
//       document = createdDocument;
//     }

//     job = await createGenerationJob(document, session);

//     await session.commitTransaction();
//     committed = true;
//   } catch (error) {
//     if (!committed) {
//       await session.abortTransaction();
//     }

//     throw error;
//   } finally {
//     await session.endSession();
//   }

//   try {
//     await startGeneration(document, job);
//   } catch (error) {
//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "failed",
//       error: `Queue enqueue failed: ${error.message}`,
//     });

//     throw error;
//   }

//   return {
//     document,
//     job,
//     reused: Boolean(existingDocument),
//   };
// };

// module.exports = persistAndGenerate;
// const mongoose = require("mongoose");
// const createGenerationJob = require("./createGenerationJob");
// const startGeneration = require("./startGeneration");
// const { GenerationJob } = require("../../models");

// const persistAndGenerate = async ({
//   model,
//   payload,
//   existingDocument = null,
// }) => {
//   const session = await mongoose.startSession();

//   let document;
//   let job;
//   let committed = false;

//   try {
//     session.startTransaction();

//     document = existingDocument;

//     if (!document) {
//       const [createdDocument] = await model.create([payload], { session });
//       document = createdDocument;
//     }

//     job = await createGenerationJob(document, session);

//     await session.commitTransaction();
//     committed = true;
//   } catch (error) {
//     if (!committed) {
//       await session.abortTransaction();
//     }

//     throw error;
//   } finally {
//     await session.endSession();
//   }

//   try {
//     await startGeneration(document, job);
//   } catch (error) {
//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "failed",
//       error: `Queue enqueue failed: ${error.message}`,
//     });

//     throw error;
//   }

//   return {
//     document,
//     job,
//     reused: Boolean(existingDocument),
//   };
// };

// module.exports = persistAndGenerate;
// const mongoose = require("mongoose");
// const createGenerationJob = require("./createGenerationJob");
// const startGeneration = require("./startGeneration");
// const { GenerationJob } = require("../../models");

// const persistAndGenerate = async ({
//   model,
//   payload,
//   clientId,
//   existingDocument = null,
// }) => {
//   const session = await mongoose.startSession();

//   let document;
//   let job;
//   let committed = false;
//   let existing = false;

//   try {
//     session.startTransaction();

//     document = existingDocument;

//     if (!document) {
//       const [createdDocument] = await model.create([payload], { session });
//       document = createdDocument;
//     }

//     const createJobResult = await createGenerationJob(
//       document,
//       clientId,
//       session,
//     );
//     job = createJobResult.job;
//     existing = createJobResult.existing;

//     await session.commitTransaction();
//     committed = true;
//   } catch (error) {
//     if (!committed) {
//       await session.abortTransaction();
//     }

//     throw error;
//   } finally {
//     await session.endSession();
//   }

//   if (!existing) {
//     try {
//       await startGeneration(document, job);
//     } catch (error) {
//       await GenerationJob.findByIdAndUpdate(job._id, {
//         status: "failed",
//         error: `Queue enqueue failed: ${error.message}`,
//       });

//       throw error;
//     }
//   }

//   return {
//     document,
//     job,
//     reused: Boolean(existingDocument),
//     existing,
//   };
// };

// module.exports = persistAndGenerate;
const mongoose = require("mongoose");
const createGenerationJob = require("./createGenerationJob");
const startGeneration = require("./startGeneration");
const findActiveGenerationJobByClientId = require("./findActiveGenerationJobByClientId");
const { GenerationJob, documentModels } = require("../../models");

const loadDocumentForJob = async (job) => {
  const Model = documentModels[job.documentType];

  if (!Model) {
    throw new Error(
      `Unsupported documentType in active job: ${job.documentType}`,
    );
  }

  const document = await Model.findById(job.documentId);

  if (!document) {
    throw new Error(`Document not found for active job: ${job._id}`);
  }

  return document;
};

const persistAndGenerate = async ({
  model,
  payload,
  clientId,
  existingDocument = null,
}) => {
  const activeJob = await findActiveGenerationJobByClientId(clientId);

  if (activeJob) {
    const activeDocument = await loadDocumentForJob(activeJob);

    return {
      document: activeDocument,
      job: activeJob,
      reused: true,
      existing: true,
    };
  }

  const session = await mongoose.startSession();

  let document;
  let job;
  let committed = false;

  try {
    session.startTransaction();

    document = existingDocument;

    if (!document) {
      const [createdDocument] = await model.create([payload], { session });
      document = createdDocument;
    }

    const createJobResult = await createGenerationJob(
      document,
      clientId,
      session,
    );
    job = createJobResult.job;

    if (createJobResult.existing) {
      await session.abortTransaction();
      committed = true;

      const activeDocument = await loadDocumentForJob(job);

      return {
        document: activeDocument,
        job,
        reused: true,
        existing: true,
      };
    }

    await session.commitTransaction();
    committed = true;
  } catch (error) {
    if (!committed) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    await session.endSession();
  }

  try {
    await startGeneration(document, job);
  } catch (error) {
    await GenerationJob.findByIdAndUpdate(job._id, {
      status: "failed",
      error: `Queue enqueue failed: ${error.message}`,
    });

    throw error;
  }

  return {
    document,
    job,
    reused: Boolean(existingDocument),
    existing: false,
  };
};

module.exports = persistAndGenerate;
