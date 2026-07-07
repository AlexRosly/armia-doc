// const path = require("path");
// const fs = require("fs/promises");
// const { generateArmdoc } = require("../armdoc");
// const { runProfiles } = require("../layout");
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
//     // PROFILE SELECTOR
//     //
//     const layoutResult = await runProfiles(report, job);
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
//       files: {
//         docx: `${job._id}.docx`,
//         pdf: `${job._id}.pdf`,
//         ...(job.mode === "with_armdoc" && {
//           armdoc: `${job._id}.armdoc`,
//         }),
//       },
//       layoutCheck: layoutResult,
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
// const { runProfiles, runOrderGeneration } = require("../layout");
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
//     } else {
//       layoutResult = await runProfiles(report, job);
//     }

//     // const jobLayoutCheck =
//     //   report.documentType === "order"
//     //     ? {
//     //         status: layoutResult.status,
//     //         profile: layoutResult.profile,
//     //         order: layoutResult.layoutCheck.order,
//     //         approval: layoutResult.layoutCheck.approval,
//     //       }
//     //     : layoutResult;
//     const jobLayoutCheck =
//       report.documentType === "order"
//         ? {
//             status: layoutResult.status,
//             profile: `${layoutResult.profile.orderProfile} + ${layoutResult.profile.approvalProfile}`,
//             orderProfile: layoutResult.profile.orderProfile,
//             approvalProfile: layoutResult.profile.approvalProfile,
//           }
//         : layoutResult;
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
const path = require("path");
const fs = require("fs/promises");
const { generateArmdoc } = require("../armdoc");
const { runProfiles } = require("../layout");
const runOrderGeneration = require("../layout/runOrderGeneration");
const { convertToPdf } = require("../pdf");
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
    // PROFILE SELECTOR / ORDER GENERATION
    //
    let layoutResult;

    if (report.documentType === "order") {
      layoutResult = await runOrderGeneration(report, job);

      await convertToPdf(
        path.join(process.cwd(), "storage", "docx", `${job._id}.docx`),
        path.join(process.cwd(), "storage", "pdf"),
      );
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
        : layoutResult;

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
      error: null,
      files: {
        docx: `${job._id}.docx`,
        pdf: `${job._id}.pdf`,
        ...(job.mode === "with_armdoc" && {
          armdoc: `${job._id}.armdoc`,
        }),
      },
      layoutCheck: jobLayoutCheck,
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
