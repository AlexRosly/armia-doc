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
  preparedSource,
}) => {
  if (!profile?.orderProfile?.template) {
    throw new Error("profile.orderProfile.template is required");
  }
  if (!profile?.approvalProfile?.template) {
    throw new Error("profile.approvalProfile.template is required");
  }
  const usesExactPreparedSource = Boolean(preparedSource);
  if (usesExactPreparedSource) {
    if (
      !preparedSource?.docxPath ||
      !preparedSource?.orderPdfPath ||
      !preparedSource?.approvalPdfPath
    ) {
      throw new Error(
        "preparedSource.docxPath, orderPdfPath and approvalPdfPath are required",
      );
    }
  } else {
    if (!orderSource?.docxPath || !orderSource?.pdfPath) {
      throw new Error(
        "orderSource.docxPath and orderSource.pdfPath are required",
      );
    }
    if (!approvalSource?.docxPath || !approvalSource?.pdfPath) {
      throw new Error(
        "approvalSource.docxPath and approvalSource.pdfPath are required",
      );
    }
  }

  const pdfDir = buildPdfDir();
  const finalPdfPath = buildFinalPublicPdfPath(outputPath, pdfDir);
  const assembledTempPdfPath = buildFinalAssembledTempPdfPath(outputPath, pdfDir);
  const mergedValidationPdfPath = buildMergedValidationPdfPath(outputPath, pdfDir);

  try {
    await safeUnlink(finalPdfPath);
    await safeUnlink(assembledTempPdfPath);
    await safeUnlink(mergedValidationPdfPath);

    let prepared;
    if (usesExactPreparedSource) {
      if (path.resolve(preparedSource.docxPath) !== path.resolve(outputPath)) {
        // Copy, do not rebuild: these are the exact bytes whose rendered order
        // pages passed the final layout protocol during profile selection.
        await fs.copyFile(preparedSource.docxPath, outputPath);
      }
      prepared = {
        printSettings: preparedSource.printSettings || payload?.printSettings,
        meta: {
          ...(preparedSource.meta || {}),
          finalValidationMode: "exact_final_docx",
          split: preparedSource.split || null,
        },
      };
    } else {
      const [orderBuffer, approvalBuffer] = await Promise.all([
        fs.readFile(orderSource.docxPath),
        fs.readFile(approvalSource.docxPath),
      ]);
      prepared = await prepareOrderPrintDocument({
        orderBuffer,
        approvalBuffer,
        printSettings: payload?.printSettings,
      });
      await fs.writeFile(outputPath, prepared.buffer);
    }

    const expectedOrderPageCount = Number(
      usesExactPreparedSource
        ? preparedSource.orderPageCount
        : orderSource.pageCount,
    );
    const expectedApprovalPageCount = Number(
      usesExactPreparedSource
        ? preparedSource.approvalPageCount
        : approvalSource.pageCount || 1,
    );

    // Structural verification does not mutate the DOCX. In exact mode the
    // layout proof was already made from this same final byte sequence.
    const mergedDocxValidation = await validateGeneratedOrderDocument({
      docxPath: outputPath,
      pdfDir,
      buildPdfPath: (docxPath) =>
        buildMergedValidationPdfPath(docxPath, pdfDir),
      assemblyMeta: prepared.meta,
      expectedMainOrderPageCount: expectedOrderPageCount,
      expectedApprovalPageCount,
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

    const exactOrderPdfPath = usesExactPreparedSource
      ? preparedSource.orderPdfPath
      : orderSource.pdfPath;
    const exactApprovalPdfPath = usesExactPreparedSource
      ? preparedSource.approvalPdfPath
      : approvalSource.pdfPath;

    // PDF remains intentionally duplex-aware. In exact mode both source PDFs
    // were split from the render of the same final DOCX returned above.
    const printPdfMeta = await assembleOrderPrintPdf({
      orderPdfPath: exactOrderPdfPath,
      approvalPdfPath: exactApprovalPdfPath,
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
      finalValidationMode: usesExactPreparedSource
        ? "exact_final_docx"
        : "legacy_independent_sources",
    };
  } finally {
    await Promise.all([
      safeUnlink(mergedValidationPdfPath),
      safeUnlink(assembledTempPdfPath),
    ]);
  }
};

module.exports = generateOrderDocument;
