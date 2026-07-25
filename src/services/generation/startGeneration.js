// const runGenerationJob = require("./runGenerationJob");

// const startGeneration = (document, job) => {
//   setImmediate(async () => {
//     try {
//       await runGenerationJob(document, job);
//     } catch (error) {
//       console.error(error);
//     }
//   });
// };

const generationQueue = require("../../queue");

const startGeneration = async (document, job) => {
  await generationQueue.add("generate-document", {
    jobId: String(job._id),
    documentId: String(document._id),
    documentType: job.documentType,
  });

  console.log(
    `[queue] enqueued generation job mongo=${job._id} bull=${bullJob.id} type=${job.documentType}`,
  );
};

module.exports = startGeneration;
