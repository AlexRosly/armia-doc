const fs = require("fs/promises");
const path = require("path");

const { convertToPdf } = require("../../pdf");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
const validateOrderPrintSettings = require("./validateOrderPrintSettings");
const ORDER_PRINT_ERRORS = require("./orderPrintErrors");

const buildDefaultPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const readPageCount = async (pdfPath) => {
  const pdf = await pdfjs.getDocument(pdfPath).promise;
  return pdf.numPages;
};

const validateGeneratedOrderDocument = async ({
  docxPath,
  pdfDir,
  buildPdfPath,
  assemblyMeta = {},
  expectedMainOrderPageCount,
  expectedApprovalPageCount = 1,
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

  const totalPageCount = await readPageCount(targetPdfPath);
  const expectedOrder = Number(expectedMainOrderPageCount);
  const expectedApproval = Number(expectedApprovalPageCount);
  const hasExpectedBreakdown =
    Number.isInteger(expectedOrder) &&
    expectedOrder >= 1 &&
    Number.isInteger(expectedApproval) &&
    expectedApproval >= 1;
  const expectedTotalPageCount = hasExpectedBreakdown
    ? expectedOrder + expectedApproval
    : null;
  const validPageCount = hasExpectedBreakdown
    ? totalPageCount === expectedTotalPageCount
    : totalPageCount >= 2;

  const meta = {
    totalPageCount,
    expectedTotalPageCount,
    expectedMainOrderPageCount: hasExpectedBreakdown ? expectedOrder : null,
    expectedApprovalPageCount: hasExpectedBreakdown ? expectedApproval : null,
    technicalBlankPageCount: 0,
    pdfPath: targetPdfPath,
    assemblyMode: assemblyMeta?.mode || "unknown",
    validationMode: "structural_page_preservation",
  };

  if (!validPageCount) {
    return {
      ok: false,
      errors: [ORDER_PRINT_ERRORS.PAGE_COUNT_INVALID],
      meta,
    };
  }

  return { ok: true, errors: [], meta };
};

module.exports = validateGeneratedOrderDocument;
