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

const assertCompatibleActiveJob = require("./assertCompatibleActiveJob");

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

const fingerprintRequest = require("./requestFingerprint");
const { ensureActiveJobIndex } = require("./ensureActiveJobIndex");

const persistAndGenerate = async ({ model, payload, clientId, existingDocument = null, lifecycleToken = null }) => {
  if (typeof clientId !== "string" || !clientId.trim()) {
    throw Object.assign(new Error("Не вдалося визначити сесію браузера. Повторіть запит."), {
      status: 400, code: "CLIENT_ID_REQUIRED",
    });
  }
  // Fail closed: no new job can be inserted before the DB constraint exists.
  try {
    await ensureActiveJobIndex();
  } catch (cause) {
    throw Object.assign(new Error("Створення нових документів тимчасово недоступне. Спробуйте пізніше або зверніться до підтримки.", { cause }), {
      status: 503, code: "GENERATION_ADMISSION_UNAVAILABLE",
    });
  }
  const lifecycle = lifecycleToken ? require("./lifecycle/requests") : null;
  const requestId = lifecycle ? await lifecycle.prepare(lifecycleToken, clientId) : null;
  const fingerprint = fingerprintRequest(payload);
  const reuse = async active => {
    assertCompatibleActiveJob(active, payload, fingerprint);
    if (requestId) await lifecycle.attach(requestId, active, clientId);
    return { document: await loadDocumentForJob(active), job: active, reused: true, existing: true };
  };
  const activeJob = await findActiveGenerationJobByClientId(clientId);
  if (activeJob) return reuse(activeJob);

  const session = await mongoose.startSession();
  let document, job, existing;
  try {
    // Driver handles transient transaction retries and unknown commit results.
    // No generation/queue/file side effects occur inside this callback.
    await session.withTransaction(async () => {
      document = existingDocument;
      if (!document) {
        [document] = await model.create([payload], { session });
      }
      const result = await createGenerationJob(document, clientId, session, fingerprint, Boolean(requestId));
      job = result.job;
      existing = result.existing;
      if (requestId) await lifecycle.attach(requestId, job, clientId, session);
      if (existing) {
        assertCompatibleActiveJob(job, payload, fingerprint);
        // Roll back the speculative source document as well as the transaction.
        throw Object.assign(new Error("Concurrent active generation"), { code: "ACTIVE_JOB_RACE" });
      }
    });
  } catch (error) {
    const admissionDuplicate = error.code === 11000 &&
      (error.message?.includes("one_active_generation_per_client") ||
       (error.keyPattern?.clientId === 1 && Object.keys(error.keyPattern).length === 1));
    if (admissionDuplicate || error.code === "ACTIVE_JOB_RACE") {
      // withTransaction has aborted; read the winner outside its old snapshot.
      const winner = await findActiveGenerationJobByClientId(clientId);
      if (winner) return reuse(winner);
      throw Object.assign(new Error("Стан попередньої генерації змінився. Перевірте його та повторіть запит."), {
        status: 409, code: "GENERATION_RETRY_REQUIRED",
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }
  try {
    await startGeneration(document, job);
  } catch (error) {
    await GenerationJob.findByIdAndUpdate(job._id, {
      status: "failed", error: `Queue enqueue failed: ${error.message}`,
    });
    throw error;
  }
  return { document, job, reused: Boolean(existingDocument), existing: false };
};

module.exports = persistAndGenerate;
