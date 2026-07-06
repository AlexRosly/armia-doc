const { ActDocument } = require("../../models");
const { persistAndGenerate } = require("../../services/generation");

const createAct = async (req, res, next) => {
  try {
    const { document, job } = await persistAndGenerate({
      model: ActDocument,

      payload: req.body,
    });

    res.status(201).json({
      documentId: document._id,

      jobId: job._id,
    });
  } catch (error) {
    console.error("Error in controller createAct:", error);
    next(error);
  }
};

module.exports = createAct;
