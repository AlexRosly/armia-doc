// const fs = require("fs/promises");
// const path = require("path");

// // const { GenerationJob } = require("../../models");
// const {
//   GenerationJob,
//   ReportDocument,
//   // OrderDocument,
//   // ActDocument,
// } = require("../../models");

// const safeDelete = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (_) {}
// };

// const cleanupExpiredJobs = async () => {
//   const expiredJobs = await GenerationJob.find({
//     expiresAt: { $lte: new Date() },
//   });

//   // for (const job of expiredJobs) {
//   //   if (job.files?.docx) {
//   //     await safeDelete(
//   //       path.join(process.cwd(), "storage", "docx", job.files.docx),
//   //     );
//   //   }

//   //   if (job.files?.armdoc) {
//   //     await safeDelete(
//   //       path.join(process.cwd(), "storage", "armdoc", job.files.armdoc),
//   //     );
//   //   }

//   //   if (job.files?.pdf) {
//   //     await safeDelete(
//   //       path.join(process.cwd(), "storage", "pdf", job.files.pdf),
//   //     );
//   //   }

//   //   const DocumentModel = documentModels[job.documentType];

//   //   if (DocumentModel && job.documentId) {
//   //     await DocumentModel.deleteOne({
//   //       _id: job.documentId,
//   //     });
//   //   }

//   //   await GenerationJob.deleteOne({
//   //     _id: job._id,
//   //   });
//   // }
//   for (const [type, fileName] of Object.entries(job.files || {})) {
//     await safeDelete(
//       path.join(
//         process.cwd(),

//         "storage",

//         type,

//         fileName,
//       ),
//     );
//   }
// };

// module.exports = cleanupExpiredJobs;

// const fs = require("fs/promises");
// const path = require("path");

// const { GenerationJob, documentModels } = require("../../models");

// const CLEANUP_RETRY_COUNT = 3;
// const CLEANUP_RETRY_DELAY_MS = 300;

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const buildFilePath = (type, fileName) =>
//   path.join(process.cwd(), "storage", type, fileName);

// const deleteFileWithRetry = async (
//   filePath,
//   attempts = CLEANUP_RETRY_COUNT,
// ) => {
//   for (let attempt = 1; attempt <= attempts; attempt += 1) {
//     try {
//       await fs.unlink(filePath);
//       return { ok: true, skipped: false };
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return { ok: true, skipped: true };
//       }

//       const isLastAttempt = attempt === attempts;

//       if (isLastAttempt) {
//         return {
//           ok: false,
//           skipped: false,
//           error,
//         };
//       }

//       await sleep(CLEANUP_RETRY_DELAY_MS);
//     }
//   }

//   return { ok: false, skipped: false };
// };

// const cleanupJobFiles = async (job) => {
//   const failedFiles = [];

//   for (const [type, fileName] of Object.entries(job.files || {})) {
//     if (!fileName || typeof fileName !== "string") {
//       continue;
//     }

//     const filePath = buildFilePath(type, fileName);
//     const result = await deleteFileWithRetry(filePath);

//     if (!result.ok) {
//       failedFiles.push({
//         type,
//         fileName,
//         filePath,
//         code: result.error?.code,
//         message: result.error?.message,
//       });
//     }
//   }

//   return {
//     ok: failedFiles.length === 0,
//     failedFiles,
//   };
// };

// const cleanupSourceDocument = async (job) => {
//   const DocumentModel = documentModels[job.documentType];

//   if (!DocumentModel || !job.documentId) {
//     return;
//   }

//   await DocumentModel.deleteOne({
//     _id: job.documentId,
//   });
// };

// const cleanupExpiredJobs = async () => {
//   const expiredJobs = await GenerationJob.find({
//     expiresAt: {
//       $lte: new Date(),
//     },
//   });

//   for (const job of expiredJobs) {
//     const fileCleanupResult = await cleanupJobFiles(job);

//     if (!fileCleanupResult.ok) {
//       console.error(
//         `[cleanupExpiredJobs] failed to delete files for job ${job._id}`,
//         fileCleanupResult.failedFiles,
//       );
//       continue;
//     }

//     await cleanupSourceDocument(job);

//     await GenerationJob.deleteOne({
//       _id: job._id,
//     });
//   }
// };

// module.exports = cleanupExpiredJobs;

// const fs = require("fs/promises");
// const path = require("path");

// const { GenerationJob, documentModels } = require("../../models");

// const safeDelete = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (_) {}
// };

// const cleanupExpiredJobs = async () => {
//   const expiredJobs = await GenerationJob.find({
//     expiresAt: {
//       $lte: new Date(),
//     },
//   });

//   for (const job of expiredJobs) {
//     //
//     // DELETE FILES
//     //

//     for (const [type, fileName] of Object.entries(job.files || {})) {
//       if (!fileName || typeof fileName !== "string") {
//         continue;
//       }
//       // const filePath = path.join(process.cwd(), "storage", type, fileName);
//       await safeDelete(path.join(process.cwd(), "storage", type, fileName));
//     }

//     //
//     // DELETE SOURCE DOCUMENT
//     //

//     const DocumentModel = documentModels[job.documentType];

//     if (DocumentModel && job.documentId) {
//       await DocumentModel.deleteOne({
//         _id: job.documentId,
//       });
//     }

//     //
//     // DELETE JOB
//     //

//     await GenerationJob.deleteOne({
//       _id: job._id,
//     });
//   }
// };

// module.exports = cleanupExpiredJobs;
// const fs = require("fs/promises");
// const path = require("path");

// const { GenerationJob, documentModels } = require("../../models");

// const CLEANUP_RETRY_COUNT = 3;
// const CLEANUP_RETRY_DELAY_MS = 300;

// const FILE_STORAGE_DIRS = {
//   docx: "docx",
//   pdf: "pdf",
//   armdoc: "armdoc",
// };

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const buildFilePath = (storageDir, fileName) =>
//   path.join(process.cwd(), "storage", storageDir, fileName);

// const deleteFileWithRetry = async (
//   filePath,
//   attempts = CLEANUP_RETRY_COUNT,
// ) => {
//   for (let attempt = 1; attempt <= attempts; attempt += 1) {
//     try {
//       await fs.unlink(filePath);
//       return { ok: true, skipped: false };
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return { ok: true, skipped: true };
//       }

//       const isLastAttempt = attempt === attempts;

//       if (isLastAttempt) {
//         return {
//           ok: false,
//           skipped: false,
//           error,
//         };
//       }

//       await sleep(CLEANUP_RETRY_DELAY_MS);
//     }
//   }

//   return { ok: false, skipped: false };
// };

// const cleanupJobFiles = async (job) => {
//   const failedFiles = [];

//   for (const [fileType, fileValue] of Object.entries(job.files || {})) {
//     const storageDir = FILE_STORAGE_DIRS[fileType];

//     if (!storageDir) {
//       continue;
//     }

//     if (!fileValue || typeof fileValue !== "string") {
//       continue;
//     }

//     const filePath = buildFilePath(storageDir, fileValue);
//     const result = await deleteFileWithRetry(filePath);

//     if (!result.ok) {
//       failedFiles.push({
//         fileType,
//         fileName: fileValue,
//         filePath,
//         code: result.error?.code,
//         message: result.error?.message,
//       });
//     }
//   }

//   return {
//     ok: failedFiles.length === 0,
//     failedFiles,
//   };
// };

// const cleanupSourceDocument = async (job) => {
//   const DocumentModel = documentModels[job.documentType];

//   if (!DocumentModel || !job.documentId) {
//     return;
//   }

//   await DocumentModel.deleteOne({
//     _id: job.documentId,
//   });
// };

// const cleanupExpiredJobs = async () => {
//   const expiredJobs = await GenerationJob.find({
//     expiresAt: {
//       $lte: new Date(),
//     },
//   });

//   for (const job of expiredJobs) {
//     const fileCleanupResult = await cleanupJobFiles(job);

//     if (!fileCleanupResult.ok) {
//       console.error(
//         `[cleanupExpiredJobs] failed to delete files for job ${job._id}`,
//         fileCleanupResult.failedFiles,
//       );
//       continue;
//     }

//     await cleanupSourceDocument(job);

//     await GenerationJob.deleteOne({
//       _id: job._id,
//     });
//   }
// };

// module.exports = cleanupExpiredJobs;
const fs = require("fs/promises");
const path = require("path");

const { GenerationJob, documentModels } = require("../../models");

const CLEANUP_RETRY_COUNT = 3;
const CLEANUP_RETRY_DELAY_MS = 300;

const STORAGE_ROOT = path.resolve(__dirname, "../../../storage");

const FILE_STORAGE_DIRS = {
  docx: "docx",
  pdf: "pdf",
  armdoc: "armdoc",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildFilePath = (storageDir, fileName) =>
  path.join(STORAGE_ROOT, storageDir, fileName);

const deleteFileWithRetry = async (
  filePath,
  attempts = CLEANUP_RETRY_COUNT,
) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.unlink(filePath);
      return { ok: true, skipped: false };
    } catch (error) {
      if (error.code === "ENOENT") {
        return { ok: true, skipped: true };
      }

      if (attempt === attempts) {
        return {
          ok: false,
          skipped: false,
          error,
        };
      }

      await sleep(CLEANUP_RETRY_DELAY_MS);
    }
  }

  return { ok: false, skipped: false };
};

const cleanupJobFiles = async (job) => {
  const failedFiles = [];

  for (const [fileType, fileName] of Object.entries(job.files || {})) {
    const storageDir = FILE_STORAGE_DIRS[fileType];

    if (!storageDir) {
      continue;
    }

    if (!fileName || typeof fileName !== "string") {
      continue;
    }

    const filePath = buildFilePath(storageDir, fileName);
    const result = await deleteFileWithRetry(filePath);

    if (!result.ok) {
      failedFiles.push({
        fileType,
        fileName,
        filePath,
        code: result.error?.code,
        message: result.error?.message,
      });
    }
  }

  return {
    ok: failedFiles.length === 0,
    failedFiles,
  };
};

const cleanupSourceDocument = async (job) => {
  const DocumentModel = documentModels[job.documentType];

  if (!DocumentModel || !job.documentId) {
    return;
  }

  await DocumentModel.deleteOne({
    _id: job.documentId,
  });
};

const cleanupExpiredJobs = async () => {
  const expiredJobs = await GenerationJob.find({
    expiresAt: {
      $lte: new Date(),
    },
  });

  for (const job of expiredJobs) {
    const fileCleanupResult = await cleanupJobFiles(job);

    if (!fileCleanupResult.ok) {
      console.error(
        `[cleanupExpiredJobs] failed to delete files for job ${job._id}`,
        fileCleanupResult.failedFiles,
      );
      continue;
    }

    await cleanupSourceDocument(job);

    await GenerationJob.deleteOne({
      _id: job._id,
    });
  }
};

module.exports = cleanupExpiredJobs;
