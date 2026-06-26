const path = require("path");
const { GenerationJob } = require("../../models");

const downloadFile = async (req, res) => {
  try {
    const { jobId, type } = req.params;

    const job = await GenerationJob.findById(jobId);

    if (!job) {
      return res.status(404).json({
        error: "JOB_NOT_FOUND",
      });
    }

    const fileName = job.files?.[type];

    if (!fileName) {
      return res.status(404).json({
        error: "FILE_NOT_FOUND",
      });
    }

    const filePath = path.join(process.cwd(), "storage", type, fileName);

    return res.download(filePath);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};

module.exports = downloadFile;

// const path = require("path");

// const { GenerationJob } = require("../../models");

// const folders = {
//   docx: "docx",

//   pdf: "pdf",

//   armdoc: "armdoc",
// };

// const downloadFile = async (req, res) => {
//   const { jobId, type } = req.params;

//   const job = await GenerationJob.findById(jobId);

//   if (!job) {
//     return res.status(404).json({
//       error: "JOB_NOT_FOUND",
//     });
//   }

//   const fileName = job.files?.[type];

//   if (!fileName) {
//     return res.status(404).json({
//       error: "FILE_NOT_FOUND",
//     });
//   }

//   const filePath = path.join(
//     process.cwd(),

//     "storage",

//     folders[type],

//     fileName,
//   );

//   return res.download(filePath);
// };

// module.exports = downloadFile;
