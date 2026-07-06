const { OrderDocument } = require("../../models");
const { persistAndGenerate } = require("../../services/generation");

const createOrder = async (req, res, next) => {
  try {
    const { document, job } = await persistAndGenerate({
      model: OrderDocument,

      payload: req.body,
    });

    res.status(201).json({
      documentId: document._id,

      jobId: job._id,
    });
  } catch (error) {
    console.error("Error in controller createOrder:", error);
    next(error);
  }
};

module.exports = createOrder;
