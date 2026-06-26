const { GenerationJob } = require("../../models");

const createGenerationJob = async (document) => {
  const job = await GenerationJob.create({
    caseId: document.caseId,

    documentType: document.documentType,

    documentId: document._id,

    mode: document.mode,

    status: "processing",

    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return job;
};

module.exports = createGenerationJob;
