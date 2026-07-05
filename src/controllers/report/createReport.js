const { ReportDocument } = require("../../models");
const { persistAndGenerate } = require("../../services/generation");

const createReport = async (req, res, next) => {
  try {
    const { document, job } = await persistAndGenerate({
      model: ReportDocument,

      payload: req.body,
    });

    res.status(201).json({
      documentId: document._id,

      jobId: job._id,
    });
  } catch (error) {
    console.error("Error in controller createReport:", error);
    next(error);
  }
};

module.exports = createReport;
