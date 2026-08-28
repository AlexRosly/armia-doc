const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

const {
  buildPagesFromPdf,
  validateEmptyLastPage,
} = require("./validators/common");
const validateActLayoutRules = require("./validators/act");

const validateActLayout = async (pdfPath, context = {}) => {
  const pdf = await pdfjs.getDocument(pdfPath).promise;
  const pages = await buildPagesFromPdf(pdf);
  const hardViolations = [];

  validateEmptyLastPage(pages, hardViolations);
  validateActLayoutRules(pages, context, hardViolations);

  // The Act is a landscape table form. A distance to the lowest text glyph is
  // cell padding/content density, not the document margin. The real Act margin
  // is checked in the final DOCX section by validateActDocxGeometry.
  const marginViolations = [];
  const bottomMetric = "docxSectionBottomMarginCm";
  const signatureViolationCodes = new Set([
    "ACT_SIGNATURE_HEADING_MISSING",
    "ACT_SIGNATURE_HEADING_HANGING",
    "ACT_SIGNATURE_NOT_FOUND",
    "ACT_SIGNATURE_BLOCK_SPLIT",
    "ACT_SIGNATURE_FIELD_MISSING",
    "ACT_SIGNATURE_WITHOUT_CONTEXT",
  ]);
  const totalsViolationCodes = new Set([
    "ACT_SERVICE_TOTALS_MISSING",
    "ACT_TOTALS_BLOCK_SPLIT",
    "ACT_GRAND_TOTAL_MISSING",
    "ACT_GRAND_TOTAL_SPLIT",
  ]);

  const layoutFlags = {
    actBlocksOk: hardViolations.length === 0,
    signatureOk: !hardViolations.some((item) =>
      signatureViolationCodes.has(item.code),
    ),
    totalsOk: !hardViolations.some((item) =>
      totalsViolationCodes.has(item.code),
    ),
  };

  return {
    pages,
    hardViolations,
    marginViolations,
    systemicWhitespace: {
      triggered: false,
      metricField: bottomMetric,
      reason: "validated_from_final_docx_section",
    },
    layoutFlags,
    bottomMetric,
    hasUnsafeBottomMargin: false,
    passed: hardViolations.length === 0,
  };
};

module.exports = validateActLayout;
