const { OrderDocument } = require("../../models");

const {
  createGenerationJob,
  startGeneration,
} = require("../../services/generation");

const createOrder = async (req, res) => {
  try {
    const order = await OrderDocument.create(req.body);
    const job = await createGenerationJob(order);

    startGeneration(order, job);

    return res.status(201).json({
      jobId: job._id,

      status: "processing",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 500,

      message: "Internal server error",
    });
  }
};

module.exports = createOrder;
