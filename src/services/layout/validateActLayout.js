const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

const {
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
  detectSystemicBottomWhitespace,
} = require("./validators/common");
const validateActLayoutRules = require("./validators/act");

const DEFAULTS = Object.freeze({
  expectedBottomMarginCm: 1.0,
  minAllowedBottomMarginCm: 0.9,
  maxAllowedBottomMarginCm: 1.1,
  systemicWhitespaceThresholdCm: 1.1,
  systemicWhitespaceMinShare: 0.5,
});

const validateActLayout = async (pdfPath, context = {}) => {
  const pdf = await pdfjs.getDocument(pdfPath).promise;
  const pages = await buildPagesFromPdf(pdf);
  const hardViolations = [];

  validateEmptyLastPage(pages, hardViolations);
  validateActLayoutRules(pages, context, hardViolations);

  const expectedBottomMarginCm = Number(
    context.expectedBottomMarginCm ?? DEFAULTS.expectedBottomMarginCm,
  );
  const minAllowedBottomMarginCm = Number(
    context.minAllowedBottomMarginCm ?? DEFAULTS.minAllowedBottomMarginCm,
  );
  const maxAllowedBottomMarginCm = Number(
    context.maxAllowedBottomMarginCm ?? DEFAULTS.maxAllowedBottomMarginCm,
  );
  const systemicWhitespaceThresholdCm = Number(
    context.systemicWhitespaceThresholdCm ??
      DEFAULTS.systemicWhitespaceThresholdCm,
  );
  const systemicWhitespaceMinShare = Number(
    context.systemicWhitespaceMinShare ??
      DEFAULTS.systemicWhitespaceMinShare,
  );
  const bottomMetric = "actualBottomTextGapCm";

  const marginViolations = validateBottomMargins(pages, {
    minAllowedBottomMarginCm,
    maxAllowedBottomMarginCm,
    metricField: bottomMetric,
  });
  const systemicWhitespace = detectSystemicBottomWhitespace(pages, {
    expectedBottomMarginCm,
    thresholdCm: systemicWhitespaceThresholdCm,
    minShare: systemicWhitespaceMinShare,
    metricField: bottomMetric,
  });
  const hasUnsafeBottomMargin = marginViolations.some(
    (violation) => violation.status === "below_min",
  );
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
    systemicWhitespace,
    layoutFlags,
    bottomMetric,
    hasUnsafeBottomMargin,
    passed: hardViolations.length === 0 && marginViolations.length === 0,
  };
};

module.exports = validateActLayout;
