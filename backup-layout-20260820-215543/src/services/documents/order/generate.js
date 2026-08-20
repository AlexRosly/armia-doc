const fs = require("fs/promises");
const path = require("path");

const prepareOrderPrintDocument = require("./prepareOrderPrintDocument");
const validateGeneratedOrderDocument = require("./validateGeneratedOrderDocument");
const assembleOrderPrintPdf = require("./assembleOrderPrintPdf");
const validateAssembledOrderPrintPdf = require("./validateAssembledOrderPrintPdf");
const safeUnlink = require("./safeUnlink");

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");
const buildFinalPublicPdfPath = (outputPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(outputPath).name}.pdf`);
const buildFinalAssembledTempPdfPath = (outputPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(outputPath).name}.assembled.pdf`);
const buildMergedValidationPdfPath = (outputPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(outputPath).name}.merged-preview.pdf`);

const buildAssemblerPrintSettings = (preparedPrintSettings = {}) => ({
  insertBlankPages: preparedPrintSettings.insertBlankPages,
  blankPageStrategy: preparedPrintSettings.blankPageStrategy,
  approvalPagePlacement: preparedPrintSettings.approvalPagePlacement,
  finalDuplexPageCount: preparedPrintSettings.finalDuplexPageCount,
  printerDuplexMode: preparedPrintSettings.printerDuplexMode,
  outputMode: preparedPrintSettings.outputMode,
  debugBlankPages: false,
});

const generateOrderDocument = async ({
  payload,
  outputPath,
  profile,
  orderSource,
  approvalSource,
}) => {
  if (!profile?.orderProfile?.template) {
    throw new Error("profile.orderProfile.template is required");
  }
  if (!profile?.approvalProfile?.template) {
    throw new Error("profile.approvalProfile.template is required");
  }
  if (!orderSource?.docxPath || !orderSource?.pdfPath) {
    throw new Error("orderSource.docxPath and orderSource.pdfPath are required");
  }
  if (!approvalSource?.docxPath || !approvalSource?.pdfPath) {
    throw new Error(
      "approvalSource.docxPath and approvalSource.pdfPath are required",
    );
  }

  const pdfDir = buildPdfDir();
  const finalPdfPath = buildFinalPublicPdfPath(outputPath, pdfDir);
  const assembledTempPdfPath = buildFinalAssembledTempPdfPath(outputPath, pdfDir);
  const mergedValidationPdfPath = buildMergedValidationPdfPath(outputPath, pdfDir);

  try {
    await safeUnlink(finalPdfPath);
    await safeUnlink(assembledTempPdfPath);
    await safeUnlink(mergedValidationPdfPath);

    const [orderBuffer, approvalBuffer] = await Promise.all([
      fs.readFile(orderSource.docxPath),
      fs.readFile(approvalSource.docxPath),
    ]);
    const prepared = await prepareOrderPrintDocument({
      orderBuffer,
      approvalBuffer,
      printSettings: payload?.printSettings,
    });
    await fs.writeFile(outputPath, prepared.buffer);

    // The merged Word file is checked only for structural page preservation.
    // Layout rules were already checked on the standalone sources.
    const mergedDocxValidation = await validateGeneratedOrderDocument({
      docxPath: outputPath,
      pdfDir,
      buildPdfPath: (docxPath) =>
        buildMergedValidationPdfPath(docxPath, pdfDir),
      assemblyMeta: prepared.meta,
      expectedMainOrderPageCount: Number(orderSource.pageCount),
      expectedApprovalPageCount: Number(approvalSource.pageCount || 1),
    });

    if (!mergedDocxValidation.ok) {
      const error = new Error("Generated merged DOCX validation failed");
      error.codes = mergedDocxValidation.errors;
      error.meta = mergedDocxValidation.meta;
      throw error;
    }

    const assemblerPrintSettings = buildAssemblerPrintSettings(
      prepared.printSettings,
    );

    // PDF remains the intentionally duplex-aware artifact. It is assembled
    // from the exact validated standalone PDFs without re-rendering the order.
    const printPdfMeta = await assembleOrderPrintPdf({
      orderPdfPath: orderSource.pdfPath,
      approvalPdfPath: approvalSource.pdfPath,
      outputPdfPath: assembledTempPdfPath,
      printSettings: assemblerPrintSettings,
    });
    const printPdfValidation = await validateAssembledOrderPrintPdf({
      pdfPath: assembledTempPdfPath,
      expectedOrderPageCount: printPdfMeta.orderPageCount,
      expectedApprovalPageCount: printPdfMeta.approvalPageCount,
    });

    if (!printPdfValidation.ok) {
      const error = new Error("Final assembled PDF validation failed");
      error.codes = printPdfValidation.errors;
      error.meta = printPdfValidation.meta;
      throw error;
    }

    await safeUnlink(finalPdfPath);
    await fs.rename(assembledTempPdfPath, finalPdfPath);

    return {
      docxPath: outputPath,
      pdfPath: finalPdfPath,
      pdfMeta: { ...printPdfMeta, outputPdfPath: finalPdfPath },
      pdfValidation: { ...printPdfValidation.meta, pdfPath: finalPdfPath },
      mergedDocxValidation: mergedDocxValidation.meta,
      preparedPrintSettings: prepared.printSettings,
      assemblerPrintSettings,
    };
  } finally {
    await Promise.all([
      safeUnlink(mergedValidationPdfPath),
      safeUnlink(assembledTempPdfPath),
    ]);
  }
};

module.exports = generateOrderDocument;
