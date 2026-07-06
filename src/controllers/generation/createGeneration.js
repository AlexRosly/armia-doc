const schema = require("../../validators/report.schema");
const { GenerationJob, ReportDocument } = require("../../models");
const { generation: runGenerationJob } = require("../../services");

const createGeneration = async (req, res) => {
  try {
    const report = await ReportDocument.create(req.body);

    const job = await GenerationJob.create({
      caseId: report.caseId,
      mode: report.mode,
      status: "processing",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    setImmediate(async () => {
      try {
        await runGenerationJob(report, job);
      } catch (error) {
        console.error(error);

        await GenerationJob.findByIdAndUpdate(job._id, {
          status: "failed",
        });
      }
    });

    return res.status(201).json({
      jobId: job._id,
      status: "processing",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};

module.exports = createGeneration;
