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

const fs = require("fs/promises");
const path = require("path");

const { GenerationJob, documentModels } = require("../../models");

const safeDelete = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (_) {}
};

const cleanupExpiredJobs = async () => {
  const expiredJobs = await GenerationJob.find({
    expiresAt: {
      $lte: new Date(),
    },
  });

  for (const job of expiredJobs) {
    //
    // DELETE FILES
    //

    for (const [type, fileName] of Object.entries(job.files || {})) {
      if (!fileName || typeof fileName !== "string") {
        continue;
      }
      // const filePath = path.join(process.cwd(), "storage", type, fileName);
      await safeDelete(path.join(process.cwd(), "storage", type, fileName));
    }

    //
    // DELETE SOURCE DOCUMENT
    //

    const DocumentModel = documentModels[job.documentType];

    if (DocumentModel && job.documentId) {
      await DocumentModel.deleteOne({
        _id: job.documentId,
      });
    }

    //
    // DELETE JOB
    //

    await GenerationJob.deleteOne({
      _id: job._id,
    });
  }
};

module.exports = cleanupExpiredJobs;
