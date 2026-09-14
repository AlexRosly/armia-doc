// const { ReportDocument } = require("../../models");
// const { persistAndGenerate } = require("../../services/generation");

// const createReport = async (req, res, next) => {
//   try {
//     const { document, job } = await persistAndGenerate({
//       model: ReportDocument,

//       payload: req.body,
//     });

//     res.status(201).json({
//       documentId: document._id,

//       jobId: job._id,
//     });
//   } catch (error) {
//     console.error("Error in controller createReport:", error);
//     next(error);
//   }
// };

// module.exports = createReport;
const { ReportDocument } = require("../../models");
const { persistAndGenerate } = require("../../services/generation");

const createReport = async (req, res, next) => {
  try {
    const { document, job, existing } = await persistAndGenerate({
      model: ReportDocument,
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
    return next(error);
  }
};

module.exports = createReport;
