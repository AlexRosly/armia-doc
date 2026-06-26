const path = require("path");

const { GenerationJob } = require("../../models");

const downloadReport = async (req, res) => {
  const job = await GenerationJob.findById(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      error: "JOB_NOT_FOUND",
    });
  }
  if (!job.files?.docx) {
    return res.status(404).json({
      error: "FILE_NOT_FOUND",
    });
  }

  if (new Date() > job.expiresAt) {
    return res.status(410).json({
      error: "FILE_EXPIRED",
    });
  }

  const filePath = path.join(process.cwd(), "storage", "docx", job.files.docx);

  return res.download(filePath);
};

module.exports = downloadReport;
