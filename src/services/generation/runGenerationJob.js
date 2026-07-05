// const path = require("path");

// const { generateDocx } = require("../docx");

// const { runProfiles } = require("../layout");

// const { GenerationJob } = require("../../models");

// module.exports = async function runGenerationJob(report, job) {
//   const fileName = `${job._id}.docx`;

//   const docxPath = path.join(process.cwd(), "storage", "docx", fileName);

//   await generateDocx(report.toObject(), docxPath);

//   const layoutResult = await runProfiles();

//   //   await GenerationJob.findByIdAndUpdate(job._id, {
//   //     status: "ready",

//   //     files: {
//   //       docx: fileName,
//   //     },

//   //     layoutCheck: layoutResult,
//   //   });
//   await GenerationJob.findByIdAndUpdate(job._id, {
//     status: "ready",

//     files: {
//       docx: fileName,
//     },
//   });
// };
// const path = require("path");

// const { generateDocx } = require("../docx");
// const { generateArmdoc } = require("../armdoc");
// const { convertToPdf } = require("../pdf");

// const { runProfiles } = require("../layout");

// const { GenerationJob } = require("../../models");

// const runGenerationJob = async (report, job) => {
//   try {
//     const docxFile = `${job._id}.docx`;
//     const pdfFile = `${job._id}.pdf`;
//     const armdocFile = `${job._id}.armdoc`;

//     const docxPath = path.join(process.cwd(), "storage", "docx", docxFile);

//     const pdfDir = path.join(process.cwd(), "storage", "pdf");

//     //
//     // ARMDOC
//     //

//     if (job.mode === "with_armdoc") {
//       const armdocPath = path.join(
//         process.cwd(),
//         "storage",
//         "armdoc",
//         armdocFile,
//       );

//       await generateArmdoc(report.toObject(), armdocPath);
//     }

//     //
//     // DOCX
//     //

//     // await generateDocx(report.toObject(), docxPath);

//     //
//     // PDF
//     //

//     // // await convertToPdf(docxPath, pdfDir);

//     // const pdfPath = path.join(pdfDir, pdfFile);

//     // if (!fs.existsSync(pdfPath)) {
//     //   throw new Error(`PDF_NOT_CREATED: ${pdfPath}`);
//     // }

//     //
//     //
//     //PROFILE SELECTOR

//     const layoutResult = await runProfiles(report, job);

//     //
//     // SAVE JOB
//     //
//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "ready",

//       files: {
//         docx: `${job._id}.docx`,

//         pdf: `${job._id}.pdf`,

//         ...(job.mode === "with_armdoc" && {
//           armdoc: `${job._id}.armdoc`,
//         }),
//       },

//       layoutCheck: layoutResult,
//     });
//     // await GenerationJob.findByIdAndUpdate(job._id, {
//     //   status: "ready",

//     //   files: {
//     //     docx: docxFile,
//     //     pdf: pdfFile,

//     //     ...(job.mode === "with_armdoc" && {
//     //       armdoc: armdocFile,
//     //     }),
//     //   },

//     //   layoutCheck: layoutResult,
//     // });
//   } catch (error) {
//     console.error(error);

//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "failed",
//       error: error.message,
//     });

//     throw error;
//   }
// };

// module.exports = runGenerationJob;
const path = require("path");
const fs = require("fs/promises");
const { generateArmdoc } = require("../armdoc");
const { runProfiles } = require("../layout");
const { GenerationJob } = require("../../models");

const runGenerationJob = async (report, job) => {
  try {
    //
    // ARMDOC
    //

    if (job.mode === "with_armdoc") {
      const armdocPath = path.join(
        process.cwd(),
        "storage",
        "armdoc",
        `${job._id}.armdoc`,
      );

      await generateArmdoc(report.toObject(), armdocPath);
    }

    //
    // PROFILE SELECTOR
    //

    const layoutResult = await runProfiles(report, job);

    //
    // VERIFY FILES
    //

    await fs.access(
      path.join(process.cwd(), "storage", "docx", `${job._id}.docx`),
    );

    await fs.access(
      path.join(process.cwd(), "storage", "pdf", `${job._id}.pdf`),
    );

    if (job.mode === "with_armdoc") {
      await fs.access(
        path.join(process.cwd(), "storage", "armdoc", `${job._id}.armdoc`),
      );
    }

    //
    // SAVE JOB
    //

    await GenerationJob.findByIdAndUpdate(job._id, {
      status: "ready",

      files: {
        docx: `${job._id}.docx`,

        pdf: `${job._id}.pdf`,

        ...(job.mode === "with_armdoc" && {
          armdoc: `${job._id}.armdoc`,
        }),
      },

      layoutCheck: layoutResult,
    });
  } catch (error) {
    console.error(error);

    await GenerationJob.findByIdAndUpdate(job._id, {
      status: "failed",

      error: error.message,
    });

    throw error;
  }
};

module.exports = runGenerationJob;
