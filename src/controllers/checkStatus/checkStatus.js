// const { GenerationJob } = require("../../models");

// const checkStatus = async (req, res) => {
//   const job = await GenerationJob.findById(req.params.jobId);

//   if (!job) {
//     return res.status(404).json({
//       error: "JOB_NOT_FOUND",
//     });
//   }

//   return res.json({
//     jobId: job._id,
//     status: job.status,
//     mode: job.mode,
//     error: job.error,
//     layoutCheck: job.layoutCheck,
//     expiresAt: job.expiresAt,
//     downloads: {
//       ...(job.files.docx && {
//         docx: `/api/generation/${job._id}/download/docx`,
//       }),
//       ...(job.files.pdf && {
//         pdf: `/api/generation/${job._id}/download/pdf`,
//       }),
//       ...(job.files.armdoc && {
//         armdoc: `/api/generation/${job._id}/download/armdoc`,
//       }),
//     },
//   });
// };

// module.exports = checkStatus;

// const { GenerationJob } = require("../../models");

// const checkStatus = async (req, res) => {
//   const job = await GenerationJob.findById(req.params.jobId);

//   if (!job) {
//     return res.status(404).json({
//       error: "JOB_NOT_FOUND",
//     });
//   }

//   res.set({
//     "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
//     Pragma: "no-cache",
//     Expires: "0",
//   });

//   return res.json({
//     jobId: job._id,
//     status: job.status,
//     mode: job.mode,
//     error: job.error,
//     layoutCheck: job.layoutCheck,
//     expiresAt: job.expiresAt,
//     downloads: {
//       ...(job.files.docx && {
//         docx: `/api/generation/${job._id}/download/docx`,
//       }),
//       ...(job.files.pdf && {
//         pdf: `/api/generation/${job._id}/download/pdf`,
//       }),
//       ...(job.files.armdoc && {
//         armdoc: `/api/generation/${job._id}/download/armdoc`,
//       }),
//     },
//   });
// };

// module.exports = checkStatus;
const {
  assertGenerationJobOwnership,
  buildGenerationJobPayload,
} = require("../../services/generation");

const checkStatus = async (req, res, next) => {
  try {
    const job = await assertGenerationJobOwnership({
      jobId: req.params.jobId,
      clientId: req.clientId,
    });

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    return res.json(buildGenerationJobPayload(job));
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: "JOB_NOT_FOUND" });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    return next(error);
  }
};

module.exports = checkStatus;
