const { documentModels } = require("../../models");
const { readArmdoc } = require("../../services/armdoc");
const { persistAndGenerate } = require("../../services/generation");

const importArmdoc = async (req, res, next) => {
  try {
    //
    // READ FILE
    //
    const document = readArmdoc(req.file);
    //
    // SAVE + GENERATE
    //
    const { document: savedDocument, job } = await persistAndGenerate({
      model: documentModels[document.documentType],
      payload: document,
    });
    //
    // RESPONSE
    //
    res.status(201).json({
      success: true,
      documentType: savedDocument.documentType,
      documentId: savedDocument._id,
      jobId: job._id,
    });
  } catch (error) {
    console.error("Error in controller importArmdoc:", error);
    next(error);
  }
};

module.exports = importArmdoc;

// const importArmdoc = async (req, res, next) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     //
//     // READ FILE
//     //

//     const document = readArmdoc(req.file);

//     //
//     // MODEL
//     //

//     const DocumentModel = documentModels[document.documentType];

//     if (!DocumentModel) {
//       throw new Error("Unsupported document type.");
//     }

//     //
//     // SAVE DOCUMENT
//     //

//     const [savedDocument] = await DocumentModel.create([document], { session });

//     //
//     // JOB
//     //

//     const job = await createGenerationJob(savedDocument, session);

//     //
//     // COMMIT
//     //

//     await session.commitTransaction();

//     session.endSession();

//     //
//     // START GENERATION
//     //

//     await runGenerationJob(savedDocument, job);

//     //
//     // RESPONSE
//     //

//     res.status(201).json({
//       success: true,

//       documentType: savedDocument.documentType,

//       documentId: savedDocument._id,

//       jobId: job._id,
//     });
//   } catch (error) {
//     await session.abortTransaction();

//     session.endSession();

//     next(error);
//   }
// };
