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

// const { generationQueue } = require("../../queue");

// const startGeneration = async (document, job) => {
//   await generationQueue.add("generate-document", {
//     jobId: String(job._id),
//     documentId: String(document._id),
//     documentType: job.documentType,
//   });

//   console.log(
//     `[queue] enqueued generation job mongo=${job._id} bull=${bullJob.id} type=${job.documentType}`,
//   );
// };

// module.exports = startGeneration;
// const runGenerationJob = require("./runGenerationJob");

// const isQueueEnabled = process.env.QUEUE_ENABLED !== "false";

// const startGeneration = async (document, job) => {
//   if (!isQueueEnabled) {
//     console.log(
//       `[queue] disabled, running generation inline for mongo=${job._id}`,
//     );

//     await runGenerationJob(document, job);
//     return;
//   }

//   const generationQueue = require("../../queue/generationQueue");

//   const bullJob = await generationQueue.add("generate-document", {
//     jobId: String(job._id),
//     documentId: String(document._id),
//     documentType: job.documentType,
//   });

//   console.log(
//     `[queue] enqueued generation job mongo=${job._id} bull=${bullJob.id} type=${job.documentType}`,
//   );
// };

// module.exports = startGeneration;
// const runGenerationJob = require("./runGenerationJob");

// const isQueueEnabled = process.env.QUEUE_ENABLED !== "false";

// const startGeneration = async (document, job) => {
//   if (!isQueueEnabled) {
//     console.log(
//       `[queue] disabled, running generation inline for mongo=${job._id}`,
//     );

//     await runGenerationJob(document, job);
//     return;
//   }

//   const generationQueue = require("../../queue/generationQueue");

//   const bullJob = await generationQueue.add("generate-document", {
//     jobId: String(job._id),
//     documentId: String(document._id),
//     documentType: job.documentType,
//   });

//   console.log(
//     `[queue] enqueued generation job mongo=${job._id} bull=${bullJob.id} type=${job.documentType}`,
//   );
// };

// module.exports = startGeneration;
// const runGenerationJob = require("./runGenerationJob");

// const isQueueEnabled = process.env.QUEUE_ENABLED !== "false";

// const startGeneration = async (document, job) => {
//   if (!isQueueEnabled) {
//     console.log(
//       `[queue] disabled, starting async inline generation for mongo=${job._id}`,
//     );

//     setImmediate(() => {
//       runGenerationJob(document, job).catch((error) => {
//         console.error(
//           `[queue] inline generation failed for mongo=${job._id}:`,
//           error,
//         );
//       });
//     });

//     return;
//   }

//   const generationQueue = require("../../queue/generationQueue");

//   const bullJob = await generationQueue.add("generate-document", {
//     jobId: String(job._id),
//     documentId: String(document._id),
//     documentType: job.documentType,
//   });

//   console.log(
//     `[queue] enqueued generation job mongo=${job._id} bull=${bullJob.id} type=${job.documentType}`,
//   );
// };

// module.exports = startGeneration;
const runGenerationJob = require("./runGenerationJob");
const { publishGenerationEvent } = require("../generationEvents");

const isQueueEnabled = process.env.QUEUE_ENABLED !== "false";

const publishQueuedEvent = async (job) => {
  try {
    await publishGenerationEvent({
      jobId: String(job._id),
      status: "queued",
      step: "queued",
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[generation-events] publish queued failed:", error.message);
  }
};

const startGeneration = async (document, job) => {
  if (job.lifecycleManaged && !isQueueEnabled) {
    // Async execution remains tracked by the durable launch record.
    void require("./lifecycle/supervisor").launch(job).catch(async error => {
      console.error("[managed-generation] supervisor failed:", error.code || error.name);
      const { GenerationJob } = require("../../models");
      await GenerationJob.updateOne({ _id: job._id }, { $set: { cancelRequestedAt: new Date(), cancelReason: "launch_failed" } }).catch(() => {});
    });
    return;
  }
  if (!isQueueEnabled) {
    console.log(
      `[queue] disabled, starting async inline generation for mongo=${job._id}`,
    );

    await publishQueuedEvent(job);

    setImmediate(() => {
      runGenerationJob(document, job).catch((error) => {
        console.error(
          `[queue] inline generation failed for mongo=${job._id}:`,
          error,
        );
      });
    });

    return;
  }

  const generationQueue = require("../../queue/generationQueue");

  const bullJob = await generationQueue.add("generate-document", {
    jobId: String(job._id),
    documentId: String(document._id),
    documentType: job.documentType,
  }, job.lifecycleManaged ? { removeOnComplete: true, removeOnFail: true, attempts: 1 } : {});

  console.log(
    `[queue] enqueued generation job mongo=${job._id} bull=${bullJob.id} type=${job.documentType}`,
  );

  await publishQueuedEvent(job);
};

module.exports = startGeneration;
