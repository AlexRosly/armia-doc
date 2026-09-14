const { OrderDocument } = require("../../models");
const { persistAndGenerate } = require("../../services/generation");

const createOrder = async (req, res, next) => {
  try {
    const { document, job, existing } = await persistAndGenerate({
      model: OrderDocument,
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
    console.error("Error in controller createOrder:", error);
    next(error);
  }
};

module.exports = createOrder;
