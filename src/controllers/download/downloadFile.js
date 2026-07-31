// const path = require("path");
// const { GenerationJob } = require("../../models");

// const downloadFile = async (req, res) => {
//   try {
//     const { jobId, type } = req.params;

//     const job = await GenerationJob.findById(jobId);

//     if (!job) {
//       return res.status(404).json({
//         error: "JOB_NOT_FOUND",
//       });
//     }

//     const fileName = job.files?.[type];

//     if (!fileName) {
//       return res.status(404).json({
//         error: "FILE_NOT_FOUND",
//       });
//     }

//     const filePath = path.join(process.cwd(), "storage", type, fileName);

//     return res.download(filePath);
//   } catch (error) {
//     console.error("Error in controller downloadFile:", error);

//     return res.status(500).json({
//       error: "INTERNAL_SERVER_ERROR",
//     });
//   }
// };

// module.exports = downloadFile;
const path = require("path");
const fs = require("fs/promises");
const { GenerationJob } = require("../../models");

const STORAGE_DIR_BY_TYPE = {
  docx: "docx",
  pdf: "pdf",
  armdoc: "armdoc",
};

const downloadFile = async (req, res) => {
  try {
    const { jobId, type } = req.params;

    const storageDir = STORAGE_DIR_BY_TYPE[type];

    if (!storageDir) {
      return res.status(400).json({
        error: "INVALID_FILE_TYPE",
      });
    }

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

    const filePath = path.join(process.cwd(), "storage", storageDir, fileName);

    await fs.access(filePath);

    return res.download(filePath, fileName);
  } catch (error) {
    console.error("Error in controller downloadFile:", error);

    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};

module.exports = downloadFile;
