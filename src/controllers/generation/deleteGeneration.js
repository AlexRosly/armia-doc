// const { deleteGenerationJob } = require("../../services/generation");

// const deleteGeneration = async (req, res, next) => {
//   try {
//     await deleteGenerationJob(req.params.jobId);

//     res.json({
//       success: true,
//     });
//   } catch (error) {
//     console.error("Error in controller deleteGeneration:", error);
//     next(error);
//   }
// };

// module.exports = deleteGeneration;
const fs = require("fs/promises");
const path = require("path");
const { assertGenerationJobOwnership } = require("../../services/generation");
const { GenerationJob } = require("../../models");

const STORAGE_DIR_BY_TYPE = {
  docx: "docx",
  pdf: "pdf",
  armdoc: "armdoc",
};

const safeUnlink = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const deleteGenerationJob = async ({ jobId, clientId }) => {
  const job = await assertGenerationJobOwnership({ jobId, clientId });

  const fileEntries = Object.entries(job.files || {});

  for (const [type, fileName] of fileEntries) {
    if (!fileName) continue;

    const storageDir = STORAGE_DIR_BY_TYPE[type];
    if (!storageDir) continue;

    const filePath = path.join(process.cwd(), "storage", storageDir, fileName);
    await safeUnlink(filePath);
  }

  await GenerationJob.deleteOne({ _id: job._id });
};

module.exports = deleteGenerationJob;
