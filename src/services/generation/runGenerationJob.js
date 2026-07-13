const path = require("path");
const fs = require("fs/promises");
const { generateArmdoc } = require("../armdoc");
const { runProfiles } = require("../layout");
const { runOrderGeneration, runActGeneration } = require("../layout");
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
