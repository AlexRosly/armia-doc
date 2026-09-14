const { ActDocument } = require("../../models");
const { persistAndGenerate } = require("../../services/generation");

const createAct = async (req, res, next) => {
  try {
    const { document, job, existing } = await persistAndGenerate({
      model: ActDocument,
      payload: req.body,
      clientId: req.clientId,
      lifecycleToken: req.get("X-Generation-Token") || null,
    });

    return res.status(existing ? 200 : 201).json({
      documentId: document._id,
      jobId: job._id,
      existing,
    });
  } catch (error) {
    console.error("Error in controller createAct:", error);
    next(error);
  }
};

module.exports = createAct;
