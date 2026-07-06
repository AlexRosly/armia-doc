const { GenerationJob } = require("../../models");

const checkStatus = async (req, res) => {
  const job = await GenerationJob.findById(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      error: "JOB_NOT_FOUND",
    });
  }

  return res.json({
    jobId: job._id,
    status: job.status,
    mode: job.mode,
    error: job.error,
    layoutCheck: job.layoutCheck,
    expiresAt: job.expiresAt,
    downloads: {
      ...(job.files.docx && {
        docx: `/api/generation/${job._id}/download/docx`,
      }),
      ...(job.files.pdf && {
        pdf: `/api/generation/${job._id}/download/pdf`,
      }),
      ...(job.files.armdoc && {
        armdoc: `/api/generation/${job._id}/download/armdoc`,
      }),
    },
  });
};

module.exports = checkStatus;
