const { documentModels } = require("../../models");
const { readArmdoc } = require("../../services/armdoc");
const { persistAndGenerate } = require("../../services/generation");

const importArmdoc = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const document = readArmdoc(req.file);
    const Model = documentModels[document.documentType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Unsupported documentType: ${document.documentType}`,
      });
    }

    const {
      document: savedDocument,
      job,
      existing,
    } = await persistAndGenerate({
      model: Model,
      payload: document,
      clientId: req.clientId,
      lifecycleToken: req.get("X-Generation-Token") || null,
    });

    return res.status(existing ? 200 : 201).json({
      success: true,
      documentType: savedDocument.documentType,
      documentId: savedDocument._id,
      jobId: job._id,
      existing,
    });
  } catch (error) {
    console.error("Error in controller importArmdoc:", error);
    next(error);
  }
};

module.exports = importArmdoc;
