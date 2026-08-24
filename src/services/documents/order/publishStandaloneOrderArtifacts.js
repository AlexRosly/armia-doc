const fs = require("fs/promises");

const assembleOrderPrintPdf = require("./assembleOrderPrintPdf");
const validateAssembledOrderPrintPdf = require("./validateAssembledOrderPrintPdf");
const safeUnlink = require("./safeUnlink");
const {
  normalizeOrderPrintSettings,
} = require("./orderPrintSettings");

const buildTempPdfPath = (finalPdfPath) =>
  finalPdfPath.replace(/\.pdf$/i, ".assembled.pdf");

const publishStandaloneOrderArtifacts = async ({
  orderSource,
  approvalSource,
  outputDocxPath,
  outputApprovalDocxPath,
  outputPdfPath,
  printSettings,
}) => {
  if (!orderSource?.docxPath || !orderSource?.pdfPath) {
    throw new Error("Standalone order DOCX and PDF sources are required");
  }
  if (!approvalSource?.docxPath || !approvalSource?.pdfPath) {
    throw new Error("Approval DOCX and PDF sources are required");
  }
  if (!outputDocxPath || !outputApprovalDocxPath || !outputPdfPath) {
    throw new Error("All standalone order output paths are required");
  }

  const tempPdfPath = buildTempPdfPath(outputPdfPath);
  const resolvedPrintSettings = normalizeOrderPrintSettings(printSettings);

  try {
    await Promise.all([
      safeUnlink(outputDocxPath),
      safeUnlink(outputApprovalDocxPath),
      safeUnlink(outputPdfPath),
      safeUnlink(tempPdfPath),
    ]);

    // Identical to the working report contract: the exact DOCX bytes whose PDF
    // passed validation become the downloadable Word file without another
    // merge, rewrite or pagination pass.
    await Promise.all([
      fs.copyFile(orderSource.docxPath, outputDocxPath),
      fs.copyFile(approvalSource.docxPath, outputApprovalDocxPath),
    ]);

    const pdfMeta = await assembleOrderPrintPdf({
      orderPdfPath: orderSource.pdfPath,
      approvalPdfPath: approvalSource.pdfPath,
      outputPdfPath: tempPdfPath,
      printSettings: resolvedPrintSettings,
    });
    const pdfValidation = await validateAssembledOrderPrintPdf({
      pdfPath: tempPdfPath,
      expectedOrderPageCount: Number(orderSource.pageCount),
      expectedApprovalPageCount: Number(approvalSource.pageCount || 1),
    });

    if (!pdfValidation.ok) {
      const error = new Error("Final assembled PDF validation failed");
      error.codes = pdfValidation.errors;
      error.meta = pdfValidation.meta;
      throw error;
    }

    await fs.rename(tempPdfPath, outputPdfPath);

    return {
      docxPath: outputDocxPath,
      approvalDocxPath: outputApprovalDocxPath,
      pdfPath: outputPdfPath,
      pdfMeta: { ...pdfMeta, outputPdfPath },
      pdfValidation: { ...pdfValidation.meta, pdfPath: outputPdfPath },
      preparedPrintSettings: resolvedPrintSettings,
      assemblerPrintSettings: resolvedPrintSettings,
      finalValidationMode:
        "standalone_order_and_approval_render_validate_promote_same_bytes",
    };
  } catch (error) {
    await Promise.all([
      safeUnlink(outputDocxPath),
      safeUnlink(outputApprovalDocxPath),
      safeUnlink(outputPdfPath),
    ]);
    throw error;
  } finally {
    await safeUnlink(tempPdfPath);
  }
};

module.exports = publishStandaloneOrderArtifacts;
