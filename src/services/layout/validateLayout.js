const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
const {
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
  validateReportLayoutRules,
  validateOrderLayoutRules,
  detectSystemicBottomWhitespace,
} = require("./validators");

const hasViolationCode = (violations, code) =>
  (violations || []).some((item) => item.code === code);

const buildLayoutFlags = (documentType, violations) => {
  if (documentType === "report") {
    return {
      proshuOk:
        !hasViolationCode(violations, "PROSHU_MISSING") &&
        !hasViolationCode(violations, "PROSHU_LAST_LINE") &&
        !hasViolationCode(violations, "PROSHU_NOT_ENOUGH_LINES_AFTER") &&
        !hasViolationCode(violations, "FOUNDATION_PHRASE_HANGING"),
      nakazuiuOk: null,
      signatureOk:
        !hasViolationCode(violations, "SIGNATURE_NOT_FOUND") &&
        !hasViolationCode(violations, "SIGNATURE_BLOCK_SPLIT") &&
        !hasViolationCode(violations, "SIGNATURE_WITHOUT_CONTEXT") &&
        !hasViolationCode(violations, "SIGN_DATE_DETACHED"),
    };
  }

  if (documentType === "order") {
    return {
      proshuOk: null,
      nakazuiuOk:
        !hasViolationCode(violations, "NAKAZUIU_MISSING") &&
        !hasViolationCode(violations, "NAKAZUIU_LAST_LINE") &&
        !hasViolationCode(violations, "NAKAZUIU_NOT_ENOUGH_LINES_AFTER"),
      signatureOk:
        !hasViolationCode(violations, "ORDER_SIGNATURE_NOT_FOUND") &&
        !hasViolationCode(violations, "ORDER_SIGNATURE_BLOCK_SPLIT") &&
        !hasViolationCode(violations, "ORDER_SIGNATURE_WITHOUT_CONTEXT"),
    };
  }

  return { proshuOk: null, nakazuiuOk: null, signatureOk: null };
};

const validateLayout = async (pdfPath, context = {}) => {
  const pdf = await pdfjs.getDocument(pdfPath).promise;
  const pages = await buildPagesFromPdf(pdf);
  const hardViolations = [];

  validateEmptyLastPage(pages, hardViolations);

  if (context.documentType === "report") {
    validateReportLayoutRules(pages, context, hardViolations);
  } else if (context.documentType === "order") {
    validateOrderLayoutRules(pages, context, hardViolations);
  }

  const usesStrictVisibleTextBottom = ["report", "order"].includes(
    context.documentType,
  );
  const metricField = usesStrictVisibleTextBottom
    ? "actualBottomTextGapCm"
    : "actualBottomMarginCm";
  const expectedBottomMarginCm = Number(
    context.expectedBottomMarginCm ?? 2.0,
  );
  const minAllowedBottomMarginCm = Number(
    context.minAllowedBottomMarginCm ?? 1.9,
  );
  const maxAllowedBottomMarginCm = Number(
    context.maxAllowedBottomMarginCm ??
      (usesStrictVisibleTextBottom ? 2.1 : 3.2),
  );
  const thresholdCm = Number(
    context.systemicWhitespaceThresholdCm ??
      (usesStrictVisibleTextBottom ? 2.1 : 2.2),
  );

  const marginViolations = validateBottomMargins(pages, {
    minAllowedBottomMarginCm,
    maxAllowedBottomMarginCm,
    metricField,
  });
  const systemicWhitespace = detectSystemicBottomWhitespace(pages, {
    expectedBottomMarginCm,
    thresholdCm,
    minShare: Number(context.systemicWhitespaceMinShare ?? 0.5),
    metricField,
  });
  const layoutFlags = buildLayoutFlags(context.documentType, hardViolations);
  const hasUnsafeBottomMargin = marginViolations.some(
    (violation) => violation.status === "below_min",
  );

  return {
    pages,
    hardViolations,
    marginViolations,
    systemicWhitespace,
    layoutFlags,
    bottomMetric: metricField,
    hasUnsafeBottomMargin,
    passed: hardViolations.length === 0 && marginViolations.length === 0,
  };
};

module.exports = validateLayout;
