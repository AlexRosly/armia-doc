// const { OrderDocument } = require("../../models");

// const {
//   createGenerationJob,
//   startGeneration,
// } = require("../../services/generation");

// const createOrder = async (req, res) => {
//   try {
//     const order = await OrderDocument.create(req.body);
//     const job = await createGenerationJob(order);

//     startGeneration(order, job);

//     return res.status(201).json({
//       jobId: job._id,

//       status: "processing",
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       status: 500,

//       message: "Internal server error",
//     });
//   }
// };

// module.exports = createOrder;
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
