// const { GenerationJob } = require("../../models");

// const createGenerationJob = async (document, session = null) => {
//   const jobs = await GenerationJob.create(
//     [
//       {
//         caseId: document.caseId,
//         documentType: document.documentType,
//         documentId: document._id,
//         mode: document.mode,
//         status: "queued",
//         expiresAt: new Date(Date.now() + 10 * 60 * 1000),
//       },
//     ],
//     session ? { session } : {},
//   );

//   return jobs[0];
// };

// module.exports = createGenerationJob;
const { GenerationJob } = require("../../models");
const findActiveGenerationJobByClientId = require("./findActiveGenerationJobByClientId");

const { createExecutionOwner } = require("./inlineExecutionOwner");

const createGenerationJob = async (document, clientId, session = null, requestFingerprint) => {
  const existingJob = await findActiveGenerationJobByClientId(
    clientId,
    session,
  );

  if (existingJob) {
    return {
      job: existingJob,
      existing: true,
    };
  }

  const jobs = await GenerationJob.create(
    [
      {
        clientId,
        execution: await createExecutionOwner(),
        requestFingerprint,
        caseId: document.caseId,
        documentType: document.documentType,
        documentId: document._id,
        mode: document.mode,
        status: "queued",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    ],
    session ? { session } : {},
  );

  return {
    job: jobs[0],
    existing: false,
  };
};

module.exports = createGenerationJob;
