const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

const {
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
} = require("./validators/common");
const validateActLayoutRules = require("./validators/act");

const validateActLayout = async (pdfPath, context = {}) => {
  const pdf = await pdfjs.getDocument(pdfPath).promise;
  const pages = await buildPagesFromPdf(pdf);
  const hardViolations = [];

  validateEmptyLastPage(pages, hardViolations);
  validateActLayoutRules(pages, context, hardViolations);

  // The section setting and the actual filled page are separate contracts.
  // validateActDocxGeometry checks the 1 cm section margin; this check rejects
  // underfilled/overflowing non-final pages by their visible lower text edge.
  const bottomMetric = "actualBottomTextGapCm";
  const marginViolations = validateBottomMargins(pages, {
    minAllowedBottomMarginCm: 0.9,
    maxAllowedBottomMarginCm: 1.1,
    metricField: bottomMetric,
  });
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
      triggered: marginViolations.some(
        (item) => item.status === "above_max",
      ),
      metricField: bottomMetric,
      reason: "validated_from_visible_pdf_text_bottom",
    },
    layoutFlags,
    bottomMetric,
    hasUnsafeBottomMargin: marginViolations.some(
      (item) => item.status === "below_min",
    ),
    passed:
      hardViolations.length === 0 && marginViolations.length === 0,
  };
};

module.exports = validateActLayout;
