// const path = require("path");
// const fs = require("fs/promises");
// const { generateArmdoc } = require("../armdoc");
// const { runProfiles } = require("../layout");
// const { runOrderGeneration, runActGeneration } = require("../layout");
// const { convertToPdf } = require("../pdf");
// const { GenerationJob } = require("../../models");

// const runGenerationJob = async (report, job) => {
//   try {
//     //
//     // ARMDOC
//     //
//     if (job.mode === "with_armdoc") {
//       const armdocPath = path.join(
//         process.cwd(),
//         "storage",
//         "armdoc",
//         `${job._id}.armdoc`,
//       );

//       await generateArmdoc(report.toObject(), armdocPath);
//     }

//     //
//     // PROFILE SELECTOR / ORDER GENERATION
//     //
//     let layoutResult;

//     if (report.documentType === "order") {
//       layoutResult = await runOrderGeneration(report, job);

//       await convertToPdf(
//         path.join(process.cwd(), "storage", "docx", `${job._id}.docx`),
//         path.join(process.cwd(), "storage", "pdf"),
//       );
//     } else if (report.documentType === "act") {
//       layoutResult = await runActGeneration(report, job);
//     } else {
//       layoutResult = await runProfiles(report, job);
//     }

//     const jobLayoutCheck =
//       report.documentType === "order"
//         ? {
//             status: layoutResult.status,
//             profile: `${layoutResult.profile.orderProfile} + ${layoutResult.profile.approvalProfile}`,
//             orderProfile: layoutResult.profile.orderProfile,
//             approvalProfile: layoutResult.profile.approvalProfile,
//           }
//         : layoutResult.layoutCheck || {
//             status: layoutResult.status,
//             profile: layoutResult.profile || null,
//             printSettings: report.printSettings || {},
//           };

//     //
//     // VERIFY FILES
//     //
//     await fs.access(
//       path.join(process.cwd(), "storage", "docx", `${job._id}.docx`),
//     );
//     await fs.access(
//       path.join(process.cwd(), "storage", "pdf", `${job._id}.pdf`),
//     );

//     if (job.mode === "with_armdoc") {
//       await fs.access(
//         path.join(process.cwd(), "storage", "armdoc", `${job._id}.armdoc`),
//       );
//     }

//     //
//     // SAVE JOB
//     //
//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "ready",
//       error: null,
//       files: {
//         docx: `${job._id}.docx`,
//         pdf: `${job._id}.pdf`,
//         ...(job.mode === "with_armdoc" && {
//           armdoc: `${job._id}.armdoc`,
//         }),
//       },
//       layoutCheck: jobLayoutCheck,
//     });
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
// const path = require("path");
// const fs = require("fs/promises");
// const { generateArmdoc } = require("../armdoc");
// const { runProfiles } = require("../layout");
// const { runOrderGeneration, runActGeneration } = require("../layout");
// const { GenerationJob } = require("../../models");

// const runGenerationJob = async (report, job) => {
//   try {
//     //
//     // ARMDOC
//     //
//     if (job.mode === "with_armdoc") {
//       const armdocPath = path.join(
//         process.cwd(),
//         "storage",
//         "armdoc",
//         `${job._id}.armdoc`,
//       );

//       await generateArmdoc(report.toObject(), armdocPath);
//     }

//     //
//     // PROFILE SELECTOR / ORDER GENERATION
//     //
//     let layoutResult;

//     if (report.documentType === "order") {
//       layoutResult = await runOrderGeneration(report, job);
//     } else if (report.documentType === "act") {
//       layoutResult = await runActGeneration(report, job);
//     } else {
//       layoutResult = await runProfiles(report, job);
//     }

//     const jobLayoutCheck =
//       report.documentType === "order"
//         ? {
//             status: layoutResult.status,
//             profile: `${layoutResult.profile.orderProfile} + ${layoutResult.profile.approvalProfile}`,
//             orderProfile: layoutResult.profile.orderProfile,
//             approvalProfile: layoutResult.profile.approvalProfile,
//           }
//         : layoutResult.layoutCheck || {
//             status: layoutResult.status,
//             profile: layoutResult.profile || null,
//             printSettings: report.printSettings || {},
//           };

//     //
//     // VERIFY FILES
//     //
//     await fs.access(
//       path.join(process.cwd(), "storage", "docx", `${job._id}.docx`),
//     );
//     await fs.access(layoutResult.pdfPath);

//     if (job.mode === "with_armdoc") {
//       await fs.access(
//         path.join(process.cwd(), "storage", "armdoc", `${job._id}.armdoc`),
//       );
//     }

//     //
//     // SAVE JOB
//     //
//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "ready",
//       error: null,
//       files: {
//         docx: `${job._id}.docx`,
//         pdf: path.basename(layoutResult.pdfPath),
//         ...(job.mode === "with_armdoc" && {
//           armdoc: `${job._id}.armdoc`,
//         }),
//       },
//       layoutCheck: jobLayoutCheck,
//     });
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
// const path = require("path");
// const fs = require("fs/promises");
// const { generateArmdoc } = require("../armdoc");
// const { runProfiles } = require("../layout");
// const { runOrderGeneration, runActGeneration } = require("../layout");
// const { GenerationJob } = require("../../models");

// const runGenerationJob = async (report, job) => {
//   try {
//     if (job.mode === "with_armdoc") {
//       const armdocPath = path.join(
//         process.cwd(),
//         "storage",
//         "armdoc",
//         `${job._id}.armdoc`,
//       );

//       await generateArmdoc(report.toObject(), armdocPath);
//     }

//     let layoutResult;

//     if (report.documentType === "order") {
//       layoutResult = await runOrderGeneration(report, job);
//     } else if (report.documentType === "act") {
//       layoutResult = await runActGeneration(report, job);
//     } else {
//       layoutResult = await runProfiles(report, job);
//     }

//     const jobLayoutCheck =
//       report.documentType === "order"
//         ? {
//             status: layoutResult.status,
//             profile: `${layoutResult.profile.orderProfile} + ${layoutResult.profile.approvalProfile}`,
//             orderProfile: layoutResult.profile.orderProfile,
//             approvalProfile: layoutResult.profile.approvalProfile,
//           }
//         : layoutResult.layoutCheck || {
//             status: layoutResult.status,
//             profile: layoutResult.profile || null,
//             printSettings: report.printSettings || {},
//           };

//     await fs.access(
//       path.join(process.cwd(), "storage", "docx", `${job._id}.docx`),
//     );
//     await fs.access(layoutResult.pdfPath);

//     if (job.mode === "with_armdoc") {
//       await fs.access(
//         path.join(process.cwd(), "storage", "armdoc", `${job._id}.armdoc`),
//       );
//     }

//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "ready",
//       error: null,
//       files: {
//         docx: `${job._id}.docx`,
//         pdf: path.basename(layoutResult.pdfPath),
//         ...(job.mode === "with_armdoc" && {
//           armdoc: `${job._id}.armdoc`,
//         }),
//       },
//       layoutCheck: jobLayoutCheck,
//     });
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
// const path = require("path");
// const fs = require("fs/promises");
// const { generateArmdoc } = require("../armdoc");
// const { runProfiles } = require("../layout");
// const { runOrderGeneration, runActGeneration } = require("../layout");
// const { GenerationJob } = require("../../models");

// const runGenerationJob = async (report, job) => {
//   try {
//     if (job.mode === "with_armdoc") {
//       const armdocPath = path.join(
//         process.cwd(),
//         "storage",
//         "armdoc",
//         `${job._id}.armdoc`,
//       );

//       await generateArmdoc(report.toObject(), armdocPath);
//     }

//     let layoutResult;

//     if (report.documentType === "order") {
//       layoutResult = await runOrderGeneration(report, job);
//     } else if (report.documentType === "act") {
//       layoutResult = await runActGeneration(report, job);
//     } else {
//       layoutResult = await runProfiles(report, job);
//     }

//     const jobLayoutCheck =
//       report.documentType === "order"
//         ? {
//             status: layoutResult.status,
//             profile: `${layoutResult.profile.orderProfile} + ${layoutResult.profile.approvalProfile}`,
//             orderProfile: layoutResult.profile.orderProfile,
//             approvalProfile: layoutResult.profile.approvalProfile,
//           }
//         : layoutResult.layoutCheck || {
//             status: layoutResult.status,
//             profile: layoutResult.profile || null,
//             printSettings: report.printSettings || {},
//           };

//     const finalDocxPath = path.join(
//       process.cwd(),
//       "storage",
//       "docx",
//       `${job._id}.docx`,
//     );

//     const finalPdfPath =
//       report.documentType === "order"
//         ? layoutResult.pdfPath
//         : path.join(process.cwd(), "storage", "pdf", `${job._id}.pdf`);

//     await fs.access(finalDocxPath);
//     await fs.access(finalPdfPath);

//     if (job.mode === "with_armdoc") {
//       await fs.access(
//         path.join(process.cwd(), "storage", "armdoc", `${job._id}.armdoc`),
//       );
//     }

//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "ready",
//       error: null,
//       files: {
//         docx: `${job._id}.docx`,
//         pdf: path.basename(finalPdfPath),
//         ...(job.mode === "with_armdoc" && {
//           armdoc: `${job._id}.armdoc`,
//         }),
//       },
//       layoutCheck: jobLayoutCheck,
//     });
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
// const path = require("path");
// const fs = require("fs/promises");
// const { generateArmdoc } = require("../armdoc");
// const { runProfiles } = require("../layout");
// const { runOrderGeneration, runActGeneration } = require("../layout");
// const { GenerationJob } = require("../../models");

// const READY_TTL_MS = 10 * 60 * 1000;

// const runGenerationJob = async (report, job) => {
//   try {
//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "processing",
//       error: null,
//     });

//     console.log(`[generation] start job=${job._id} type=${job.documentType}`);

//     if (job.mode === "with_armdoc") {
//       const armdocPath = path.join(
//         process.cwd(),
//         "storage",
//         "armdoc",
//         `${job._id}.armdoc`,
//       );

//       await generateArmdoc(report.toObject(), armdocPath);
//     }

//     let layoutResult;

//     if (report.documentType === "order") {
//       layoutResult = await runOrderGeneration(report, job);
//     } else if (report.documentType === "act") {
//       layoutResult = await runActGeneration(report, job);
//     } else {
//       layoutResult = await runProfiles(report, job);
//     }

//     const jobLayoutCheck =
//       report.documentType === "order"
//         ? {
//             status: layoutResult.status,
//             profile: `${layoutResult.profile.orderProfile} + ${layoutResult.profile.approvalProfile}`,
//             orderProfile: layoutResult.profile.orderProfile,
//             approvalProfile: layoutResult.profile.approvalProfile,
//           }
//         : layoutResult.layoutCheck || {
//             status: layoutResult.status,
//             profile: layoutResult.profile || null,
//             printSettings: report.printSettings || {},
//           };

//     const finalDocxPath = path.join(
//       process.cwd(),
//       "storage",
//       "docx",
//       `${job._id}.docx`,
//     );

//     const finalPdfPath =
//       report.documentType === "order"
//         ? layoutResult.pdfPath
//         : path.join(process.cwd(), "storage", "pdf", `${job._id}.pdf`);

//     await fs.access(finalDocxPath);
//     await fs.access(finalPdfPath);

//     if (job.mode === "with_armdoc") {
//       await fs.access(
//         path.join(process.cwd(), "storage", "armdoc", `${job._id}.armdoc`),
//       );
//     }

//     await GenerationJob.findByIdAndUpdate(job._id, {
//       status: "ready",
//       error: null,
//       expiresAt: new Date(Date.now() + READY_TTL_MS),
//       files: {
//         docx: `${job._id}.docx`,
//         pdf: path.basename(finalPdfPath),
//         ...(job.mode === "with_armdoc" && {
//           armdoc: `${job._id}.armdoc`,
//         }),
//       },
//       layoutCheck: jobLayoutCheck,
//     });

//     console.log(`[generation] ready job=${job._id}`);
//   } catch (error) {
//     console.error(error);
//     console.log(`[generation] failed job=${job._id}: ${error.message}`);

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
const { runOrderGeneration, runActGeneration } = require("../layout");
const { GenerationJob } = require("../../models");

const READY_TTL_MS = 10 * 60 * 1000;

const resolveResultDocxPath = (layoutResult) => {
  if (layoutResult?.docxPath) {
    return layoutResult.docxPath;
  }

  if (layoutResult?.outputPath && layoutResult.outputPath.endsWith(".docx")) {
    return layoutResult.outputPath;
  }

  throw new Error("Generation result does not contain docxPath");
};

const resolveResultPdfPath = (layoutResult) => {
  if (layoutResult?.pdfPath) {
    return layoutResult.pdfPath;
  }

  if (layoutResult?.outputPath && layoutResult.outputPath.endsWith(".pdf")) {
    return layoutResult.outputPath;
  }

  throw new Error("Generation result does not contain pdfPath");
};

const runGenerationJob = async (report, job) => {
  try {
    await GenerationJob.findByIdAndUpdate(job._id, {
      status: "processing",
      error: null,
    });

    console.log(`[generation] start job=${job._id} type=${job.documentType}`);

    if (job.mode === "with_armdoc") {
      const armdocPath = path.join(
        process.cwd(),
        "storage",
        "armdoc",
        `${job._id}.armdoc`,
      );

      await generateArmdoc(report.toObject(), armdocPath);
    }

    let layoutResult;

    if (report.documentType === "order") {
      layoutResult = await runOrderGeneration(report, job);
    } else if (report.documentType === "act") {
      layoutResult = await runActGeneration(report, job);
    } else {
      layoutResult = await runProfiles(report, job);
    }

    const jobLayoutCheck =
      report.documentType === "order"
        ? {
            status: layoutResult.status,
            profile: `${layoutResult.profile.orderProfile} + ${layoutResult.profile.approvalProfile}`,
            orderProfile: layoutResult.profile.orderProfile,
            approvalProfile: layoutResult.profile.approvalProfile,
          }
        : layoutResult.layoutCheck || {
            status: layoutResult.status,
            profile: layoutResult.profile || null,
            printSettings: report.printSettings || {},
          };

    const finalDocxPath = resolveResultDocxPath(layoutResult);
    const finalPdfPath = resolveResultPdfPath(layoutResult);

    await fs.access(finalDocxPath);
    await fs.access(finalPdfPath);

    if (job.mode === "with_armdoc") {
      await fs.access(
        path.join(process.cwd(), "storage", "armdoc", `${job._id}.armdoc`),
      );
    }

    await GenerationJob.findByIdAndUpdate(job._id, {
      status: "ready",
      error: null,
      expiresAt: new Date(Date.now() + READY_TTL_MS),
      files: {
        docx: path.basename(finalDocxPath),
        pdf: path.basename(finalPdfPath),
        ...(job.mode === "with_armdoc" && {
          armdoc: `${job._id}.armdoc`,
        }),
      },
      layoutCheck: jobLayoutCheck,
    });

    console.log(`[generation] ready job=${job._id}`);
  } catch (error) {
    console.error(error);
    console.log(`[generation] failed job=${job._id}: ${error.message}`);

    await GenerationJob.findByIdAndUpdate(job._id, {
      status: "failed",
      error: error.message,
    });

    throw error;
  }
};

module.exports = runGenerationJob;
