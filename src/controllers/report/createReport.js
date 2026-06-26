// const path = require("path");
const { ReportDocument } = require("../../models");
// const generateDocx = require("../../services/docx/generateDocx");
// const generateArmdoc = require("../../services/armdoc/generateArmdoc");
// const runGenerationJob = require("../../services/generation/runGenerationJob");
const {
  createGenerationJob,
  startGeneration,
} = require("../../services/generation");

// const { generation: startGeneration } = require("../../services");

// const createReport = async (req, res) => {
//   let job;
//   try {
//     const report = await ReportDocument.create(req.body);

//     // if (req.body.mode === "with_armdoc") {
//     //   const armdocPath = path.join(
//     //     process.cwd(),
//     //     "storage",
//     //     "armdoc",
//     //     armdocFileName,
//     //   );

//     //   await generateArmdoc(report.toObject(), armdocPath);

//     //   job.files.armdoc = armdocFileName;
//     //   // TODO generate armdoc
//     //   // Но структура ответа уже должна быть такой:
//     //   // downloads: {
//     //   // armdoc: `/api/generation/${job._id}/download/armdoc`,
//     //   // docx: `/api/generation/${job._id}/download/docx`,
//     //   // }
//     // }

//     // job = await GenerationJob.create({
//     //   caseId: req.body.caseId,
//     //   documentType: req.body.documentType,
//     //   mode: req.body.mode,

//     //   status: "processing",
//     //   printSettings: {
//     //     printMode: req.body.data?.printSettings?.printMode || "single_side",
//     //   },
//     //   expiresAt: new Date(Date.now() + 10 * 60 * 1000),
//     // });

//     // // const fileName = `${report._id}.docx`;
//     // const docxFileName = `${job._id}.docx`;

//     // const filePath = path.join(process.cwd(), "storage", "docx", docxFileName);

//     // await generateDocx(report.toObject(), filePath);

//     // // await GenerationJob.create({
//     // //   _id: report._id,
//     // //   status: "completed",
//     // //   files: {
//     // //     docx: `${report._id}.docx`,
//     // //   },
//     // // });
//     // job.files = {
//     //   docx: docxFileName,
//     // };

//     // job.status = "ready";

//     // await job.save();

//     // // res.status(201).json({
//     // //   status: "success",
//     // //   report,
//     // //   file: {
//     // //     id: report._id,
//     // //     url: `/report/download/${report._id}`,
//     // //   },
//     // // });
//     // return res.status(201).json({
//     //   jobId: job._id,

//     //   mode: job.mode,

//     //   status: "ready",

//     //   downloads: {
//     //     docx: `/api/generation/${job._id}/download/docx`,
//     //   },

//     //   expiresAt: job.expiresAt,

//     //   layoutCheck: {
//     //     status: "passed",
//     //     profile: "default_14_100_top_20",
//     //   },
//     // });
//     const job = await GenerationJob.create({
//       caseId: req.body.caseId,
//       documentType: req.body.documentType,
//       documentId: report._id,
//       mode: req.body.mode,
//       status: "processing",
//       expiresAt: new Date(Date.now() + 10 * 60 * 1000),
//     });

//     setImmediate(async () => {
//       try {
//         await runGenerationJob(report, job);
//       } catch (error) {
//         console.error(error);
//       }
//     });

//     return res.status(201).json({
//       jobId: job._id,
//       status: "processing",
//     });
//   } catch (error) {
//     console.error("Error in controller createReport:", error);
//     if (job) {
//       job.status = "failed";
//       job.error = error.message;
//       await job.save();
//     }
//     res.status(500).json({
//       status: 500,
//       message: "Internal server error",
//     });
//   }
// };
const createReport = async (req, res) => {
  try {
    const report = await ReportDocument.create(req.body);

    const job = await createGenerationJob(report);

    startGeneration(report, job);

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

module.exports = createReport;
