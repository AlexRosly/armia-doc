const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const { assertGenerationJobOwnership } = require("../services/generation");

const router = express.Router();

router.get("/:jobId/download/approvalDocx", async (req, res, next) => {
  try {
    const job = await assertGenerationJobOwnership({
      jobId: req.params.jobId,
      clientId: req.clientId,
    });
    const fileName = job.files?.approvalDocx;

    if (job.status !== "ready" || !fileName) {
      const error = new Error("Approval DOCX is not ready");
      error.status = 404;
      throw error;
    }

    if (path.basename(fileName) !== fileName) {
      throw new Error("Invalid approval DOCX file name");
    }

    const filePath = path.join(
      process.cwd(),
      "storage",
      "docx",
      fileName,
    );
    await fs.access(filePath);

    return res.download(filePath, fileName);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
