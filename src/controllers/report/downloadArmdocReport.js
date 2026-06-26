const path = require("path");
const { GenerationJob } = require("../../models");

const downloadArmdocReport = async (req, res) => {
  const job = await GenerationJob.findById(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      error: "JOB_NOT_FOUND",
    });
  }

  if (job.mode === "docx_only") {
    return res.status(400).json({
      error: "ARMDOC_NOT_AVAILABLE_FOR_THIS_JOB",
    });
  }

  if (new Date() > job.expiresAt) {
    return res.status(410).json({
      error: "FILE_EXPIRED",
    });
  }

  if (!job.files?.armdoc) {
    return res.status(404).json({
      error: "FILE_NOT_FOUND",
    });
  }

  const filePath = path.join(
    process.cwd(),
    "storage",
    "armdoc",
    job.files.armdoc,
  );

  return res.download(filePath);
};

module.exports = downloadArmdocReport;
