// const fs = require("fs/promises");

// const validateArmdoc = require("./validateArmdoc");
// const decrypt = require("./decrypt");

// const importArmdoc = async (filePath) => {
//   const file = await fs.readFile(filePath, "utf8");

//   let payload;

//   try {
//     payload = JSON.parse(file);
//   } catch {
//     throw new Error("Invalid ARMDOC.");
//   }

//   validateArmdoc(payload);

//   return decrypt(payload);
// };

// module.exports = importArmdoc;
const fs = require("fs/promises");
const path = require("path");

const { documentModels, GenerationJob } = require("../../models");
const { readArmdoc } = require("../../services/armdoc");
const { persistAndGenerate } = require("../../services/generation");

const STORAGE_ROOT = path.join(process.cwd(), "storage");

const buildFilePath = (type, fileName) =>
  path.join(STORAGE_ROOT, type, fileName);

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const hasAvailableFiles = async (job) => {
  if (!job?.files || typeof job.files !== "object") {
    return false;
  }

  for (const [type, fileName] of Object.entries(job.files)) {
    if (!fileName || typeof fileName !== "string") {
      continue;
    }

    const exists = await fileExists(buildFilePath(type, fileName));

    if (exists) {
      return true;
    }
  }

  return false;
};

const findLatestJob = async (documentId, documentType) => {
  return GenerationJob.findOne({
    documentId,
    documentType,
  }).sort({ createdAt: -1 });
};

const importArmdoc = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const importedDocument = readArmdoc(req.file);
    const Model = documentModels[importedDocument.documentType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Unsupported documentType: ${importedDocument.documentType}`,
      });
    }

    let existingDocument = null;

    if (importedDocument._id) {
      existingDocument = await Model.findById(importedDocument._id);
    }

    if (existingDocument) {
      const latestJob = await findLatestJob(
        existingDocument._id,
        existingDocument.documentType,
      );

      if (latestJob && (await hasAvailableFiles(latestJob))) {
        return res.status(200).json({
          success: true,
          reused: true,
          regenerated: false,
          documentType: existingDocument.documentType,
          documentId: existingDocument._id,
          jobId: latestJob._id,
          message: "Document already exists, returning existing job",
        });
      }

      const { job } = await persistAndGenerate({
        model: Model,
        payload: existingDocument.toObject(),
        existingDocument,
      });

      return res.status(200).json({
        success: true,
        reused: true,
        regenerated: true,
        documentType: existingDocument.documentType,
        documentId: existingDocument._id,
        jobId: job._id,
        message: "Document already exists, created a new generation job",
      });
    }

    const { document, job } = await persistAndGenerate({
      model: Model,
      payload: importedDocument,
    });

    return res.status(201).json({
      success: true,
      reused: false,
      regenerated: false,
      documentType: document.documentType,
      documentId: document._id,
      jobId: job._id,
    });
  } catch (error) {
    console.error("Error in controller importArmdoc:", error);
    next(error);
  }
};

module.exports = importArmdoc;
