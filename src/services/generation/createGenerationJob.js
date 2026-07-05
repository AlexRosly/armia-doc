// const { GenerationJob } = require("../../models");

// const createGenerationJob = async (document) => {
//   const job = await GenerationJob.create({
//     caseId: document.caseId,

//     documentType: document.documentType,

//     documentId: document._id,

//     mode: document.mode,

//     status: "processing",

//     expiresAt: new Date(Date.now() + 10 * 60 * 1000),
//   });

//   return job;
// };

// module.exports = createGenerationJob;

//одна функция используется и обычной генерацией, и импортом.
const { GenerationJob } = require("../../models");

const createGenerationJob = async (document, session = null) => {
  const jobs = await GenerationJob.create(
    [
      {
        caseId: document.caseId,
        documentType: document.documentType,
        documentId: document._id,
        mode: document.mode,
        status: "processing",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    ],
    session ? { session } : {},
  );

  return jobs[0];
};

module.exports = createGenerationJob;
