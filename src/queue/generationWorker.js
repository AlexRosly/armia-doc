// require("dotenv").config();

// const { Worker } = require("bullmq");
// const connectDB = require("../config/db");
// const connection = require("./connection");
// const {
//   GenerationJob,
//   ActDocument,
//   OrderDocument,
//   ReportDocument,
// } = require("../models");
// const runGenerationJob = require("../services/generation/runGenerationJob");

// const getDocumentModelByType = (documentType) => {
//   switch (documentType) {
//     case "act":
//       return ActDocument;
//     case "order":
//       return OrderDocument;
//     case "report":
//       return ReportDocument;
//     default:
//       throw new Error(`Unsupported documentType: ${documentType}`);
//   }
// };

// const startWorker = async () => {
//   await connectDB();

//   const worker = new Worker(
//     "generation",
//     async (bullJob) => {
//       console.log(`[queue] processing bull job ${bullJob.id}`, bullJob.data);

//       const { jobId, documentId, documentType } = bullJob.data;

//       const job = await GenerationJob.findById(jobId);
//       if (!job) {
//         throw new Error(`GenerationJob not found: ${jobId}`);
//       }

//       const DocumentModel = getDocumentModelByType(documentType);
//       const document = await DocumentModel.findById(documentId);

//       if (!document) {
//         throw new Error(`Document not found: ${documentType}/${documentId}`);
//       }

//       await runGenerationJob(document, job);
//     },
//     {
//       connection,
//       concurrency: 1,
//     },
//   );

//   worker.on("completed", (job) => {
//     console.log(`[queue] completed bull job ${job.id}`);
//   });

//   worker.on("failed", (job, error) => {
//     console.error(`[queue] failed bull job ${job?.id}: ${error.message}`);
//   });

//   worker.on("error", (error) => {
//     console.error("[queue] worker error:", error);
//   });

//   console.log("[queue] generation worker started");
// };

// startWorker().catch((error) => {
//   console.error("[queue] worker startup error:", error);
//   process.exit(1);
// });
require("dotenv").config();

const { Worker } = require("bullmq");
const connectDB = require("../config/db");
const connection = require("./connection");
const {
  GenerationJob,
  ActDocument,
  OrderDocument,
  ReportDocument,
} = require("../models");
const runGenerationJob = require("../services/generation/runGenerationJob");
const assertRequiredFontsAvailable = require("./assertRequiredFontsAvailable");

const getDocumentModelByType = (documentType) => {
  switch (documentType) {
    case "act":
      return ActDocument;
    case "order":
      return OrderDocument;
    case "report":
      return ReportDocument;
    default:
      throw new Error(`Unsupported documentType: ${documentType}`);
  }
};

const startWorker = async () => {
  await assertRequiredFontsAvailable();
  await connectDB();

  const worker = new Worker(
    "generation",
    async (bullJob) => {
      console.log(`[queue] processing bull job ${bullJob.id}`, bullJob.data);

      const { jobId, documentId, documentType } = bullJob.data;

      const job = await GenerationJob.findById(jobId);
      if (!job) {
        throw new Error(`GenerationJob not found: ${jobId}`);
      }

      const DocumentModel = getDocumentModelByType(documentType);
      const document = await DocumentModel.findById(documentId);

      if (!document) {
        throw new Error(`Document not found: ${documentType}/${documentId}`);
      }

      await runGenerationJob(document, job);
    },
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[queue] completed bull job ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[queue] failed bull job ${job?.id}: ${error.message}`);
  });

  worker.on("error", (error) => {
    console.error("[queue] worker error:", error);
  });

  console.log("[queue] generation worker started");
};

startWorker().catch((error) => {
  console.error("[queue] worker startup error:", error.message);

  if (error.code === "REQUIRED_FONT_UNAVAILABLE") {
    console.error("[queue] startup blocked:", error.details);
  } else {
    console.error(error);
  }

  process.exit(1);
});
