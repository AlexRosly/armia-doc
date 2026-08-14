const PROSHU_RELATED_CODES = new Set([
  "PROSHU_LAST_LINE",
  "PROSHU_NOT_ENOUGH_LINES_AFTER",
  "FOUNDATION_PHRASE_HANGING",
  "PROSHU_BLOCK_ORPHANED",
]);

const NON_RECOVERABLE_CODES = new Set([
  "SIGNATURE_BLOCK_SPLIT",
  "SIGNATURE_WITHOUT_CONTEXT",
  "SIGN_DATE_DETACHED",
]);

const evaluateReportProshuPlacement = (layout = {}, options = {}) => {
  const { maxMarginViolationsForFallback = 3 } = options;

  const hardViolations = Array.isArray(layout?.hardViolations)
    ? layout.hardViolations
    : [];

  const marginViolations = Array.isArray(layout?.marginViolations)
    ? layout.marginViolations
    : [];

  const proshuViolations = hardViolations.filter((violation) =>
    PROSHU_RELATED_CODES.has(violation.code),
  );

  const nonRecoverableViolations = hardViolations.filter((violation) =>
    NON_RECOVERABLE_CODES.has(violation.code),
  );

  const otherHardViolations = hardViolations.filter(
    (violation) =>
      !PROSHU_RELATED_CODES.has(violation.code) &&
      !NON_RECOVERABLE_CODES.has(violation.code),
  );

  const shouldRunFallback =
    proshuViolations.length > 0 &&
    nonRecoverableViolations.length === 0 &&
    otherHardViolations.length === 0 &&
    marginViolations.length <= maxMarginViolationsForFallback;

  return {
    ok: proshuViolations.length === 0,
    shouldRunFallback,
    reason:
      proshuViolations.length === 0
        ? "ok"
        : shouldRunFallback
          ? "report_proshu_block_recoverable"
          : "report_has_non_recoverable_layout_issues",
    proshuViolations,
    nonRecoverableViolations,
    otherHardViolations,
    marginViolations,
  };
};

module.exports = evaluateReportProshuPlacement;
