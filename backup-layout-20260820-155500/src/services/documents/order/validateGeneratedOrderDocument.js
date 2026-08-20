const fs = require("fs/promises");
const path = require("path");

const { convertToPdf } = require("../../pdf");
const validateLayout = require("../../layout/validateLayout");
const validateOrderPrintSettings = require("./validateOrderPrintSettings");
const ORDER_PRINT_ERRORS = require("./orderPrintErrors");

const buildDefaultPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const resolvePageBreakdown = ({ totalPageCount, assemblyMeta = {} }) => {
  const mode = assemblyMeta?.mode || "unknown";
  const approvalPageCount = 1;

  if (totalPageCount < approvalPageCount) {
    return {
      mode,
      approvalPageCount: 0,
      technicalBlankPageCount: 0,
      mainOrderPageCount: 0,
    };
  }

  if (mode === "merge_order_and_approval_only") {
    const technicalBlankPageCount = 0;
    const mainOrderPageCount = totalPageCount - approvalPageCount;

    return {
      mode,
      approvalPageCount,
      technicalBlankPageCount,
      mainOrderPageCount: Math.max(mainOrderPageCount, 0),
    };
  }

  return {
    mode,
    approvalPageCount,
    technicalBlankPageCount: 0,
    mainOrderPageCount: Math.max(totalPageCount - approvalPageCount, 0),
  };
};

const validateGeneratedOrderDocument = async ({
  docxPath,
  pdfDir,
  buildPdfPath,
  assemblyMeta = {},
}) => {
  const settingsValidation = await validateOrderPrintSettings(docxPath);

  if (!settingsValidation.ok) {
    return {
      ok: false,
      errors: settingsValidation.errors,
      meta: settingsValidation.meta || {},
    };
  }

  await convertToPdf(docxPath, pdfDir);

  const generatedPdfPath = buildDefaultPdfPath(docxPath, pdfDir);
  const targetPdfPath = buildPdfPath(docxPath, pdfDir);

  if (generatedPdfPath !== targetPdfPath) {
    await fs.copyFile(generatedPdfPath, targetPdfPath);
  }

  const layout = await validateLayout(targetPdfPath, {
    documentType: "order",
    markers: {},
  });

  const totalPageCount = Array.isArray(layout?.pages) ? layout.pages.length : 0;

  if (totalPageCount < 2) {
    return {
      ok: false,
      errors: [ORDER_PRINT_ERRORS.PAGE_COUNT_INVALID],
      meta: {
        totalPageCount,
        pdfPath: targetPdfPath,
        assemblyMode: assemblyMeta?.mode || "unknown",
      },
    };
  }

  const breakdown = resolvePageBreakdown({
    totalPageCount,
    assemblyMeta,
  });

  if (breakdown.mainOrderPageCount < 1) {
    return {
      ok: false,
      errors: [ORDER_PRINT_ERRORS.PAGE_COUNT_INVALID],
      meta: {
        totalPageCount,
        pdfPath: targetPdfPath,
        assemblyMode: breakdown.mode,
        approvalPageCount: breakdown.approvalPageCount,
        technicalBlankPageCount: breakdown.technicalBlankPageCount,
        mainOrderPageCount: breakdown.mainOrderPageCount,
      },
    };
  }

  return {
    ok: true,
    errors: [],
    meta: {
      totalPageCount,
      pdfPath: targetPdfPath,
      assemblyMode: breakdown.mode,
      approvalPageCount: breakdown.approvalPageCount,
      technicalBlankPageCount: breakdown.technicalBlankPageCount,
      mainOrderPageCount: breakdown.mainOrderPageCount,
    },
  };
};

module.exports = validateGeneratedOrderDocument;
