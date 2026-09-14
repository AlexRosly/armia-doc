const fs = require("fs/promises");
const path = require("path");

const { GenerationJob, documentModels } = require("../../models");

const safeDelete = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
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

  if (DocumentModel && !(await GenerationJob.exists({ documentId: job.documentId, _id: { $ne: job._id } }))) {
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
