const fs = require("fs/promises");
const path = require("path");

const { GenerationJob, documentModels } = require("../../models");

const safeDelete = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (_) {}
};

const deleteGenerationJob = async (jobId) => {
  //
  // JOB
  //

  const job = await GenerationJob.findById(jobId);

  if (!job) {
    throw new Error("Generation job not found.");
  }

  //
  // FILES
  //

  for (const [type, fileName] of Object.entries(job.files || {})) {
    if (!fileName) continue;

    await safeDelete(path.join(process.cwd(), "storage", type, fileName));
  }

  //
  // DOCUMENT
  //

  const DocumentModel = documentModels[job.documentType];

  if (DocumentModel) {
    await DocumentModel.deleteOne({
      _id: job.documentId,
    });
  }

  //
  // JOB
  //

  await GenerationJob.deleteOne({
    _id: job._id,
  });

  return true;
};

module.exports = deleteGenerationJob;
