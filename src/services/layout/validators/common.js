const CM_IN_POINTS = 28.346;
const LINE_MERGE_THRESHOLD = 2;
const FALLBACK_DESCENT_RATIO = -0.2;

const normalizeText = (value = "") =>
  String(value)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const pushViolation = (violations, code, message, page, meta = {}) => {
  violations.push({ code, message, page, ...meta });
};

const toFiniteNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const resolveItemHeight = (item = {}) => {
  const height = Math.abs(toFiniteNumber(item.height, 0));
  if (height > 0) return height;

  const transform = Array.isArray(item.transform) ? item.transform : [];
  const verticalScale = Math.hypot(
    toFiniteNumber(transform[2], 0),
    toFiniteNumber(transform[3], 0),
  );
  if (verticalScale > 0) return verticalScale;

  return Math.hypot(
    toFiniteNumber(transform[0], 0),
    toFiniteNumber(transform[1], 0),
  );
};

const resolveDescentRatio = (item = {}, styles = {}) => {
  const descent = toFiniteNumber(styles[item.fontName]?.descent, null);
  if (descent != null && descent <= 0) return Math.max(-0.5, descent);
  return FALLBACK_DESCENT_RATIO;
};

const resolveVisibleTextBottomY = (item = {}, styles = {}) => {
  const baselineY = toFiniteNumber(item.transform?.[5], null);
  if (baselineY == null) return null;

  const height = resolveItemHeight(item);
  if (!(height > 0)) return baselineY;
  return baselineY + resolveDescentRatio(item, styles) * height;
};

const groupItemsToLines = (items = [], styles = {}) => {
  const textItems = items
    .filter((item) => normalizeText(item.str))
    .map((item) => ({
      text: item.str,
      x: toFiniteNumber(item.transform?.[4], 0),
      y: toFiniteNumber(item.transform?.[5], 0),
      bottomY: resolveVisibleTextBottomY(item, styles),
      width: toFiniteNumber(item.width, 0),
      height: resolveItemHeight(item),
    }))
    .sort((a, b) => {
      if (Math.abs(b.y - a.y) > LINE_MERGE_THRESHOLD) return b.y - a.y;
      return a.x - b.x;
    });

  const rawLines = [];
  for (const item of textItems) {
    const line = rawLines.find(
      (entry) => Math.abs(entry.y - item.y) <= LINE_MERGE_THRESHOLD,
    );
    if (line) line.items.push(item);
    else rawLines.push({ y: item.y, items: [item] });
  }

  return rawLines
    .map((line, index) => {
      const sortedItems = line.items.sort((a, b) => a.x - b.x);
      const bottoms = sortedItems
        .map((item) => item.bottomY)
        .filter(Number.isFinite);
      return {
        index,
        y: line.y,
        bottomY: bottoms.length ? Math.min(...bottoms) : line.y,
        text: normalizeText(sortedItems.map((item) => item.text).join(" ")),
        items: sortedItems,
      };
    })
    .filter((line) => line.text);
};

const pointsToCm = (points) =>
  Number((Number(points) / CM_IN_POINTS).toFixed(2));

const buildPagesFromPdf = async (pdf) => {
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const lines = groupItemsToLines(content.items, content.styles || {});

    const baselines = lines.map((line) => line.y).filter(Number.isFinite);
    const visibleBottoms = lines
      .map((line) => line.bottomY)
      .filter(Number.isFinite);
    const lowestBaselineY = baselines.length ? Math.min(...baselines) : null;
    const lowestVisibleBottomY = visibleBottoms.length
      ? Math.min(...visibleBottoms)
      : null;

    const baselineBottomMarginCm =
      lowestBaselineY == null ? null : pointsToCm(lowestBaselineY);
    const actualBottomTextGapCm =
      lowestVisibleBottomY == null ? null : pointsToCm(lowestVisibleBottomY);

    pages.push({
      pageNumber: i,
      isLastPage: i === pdf.numPages,
      width: viewport.width,
      height: viewport.height,

      // Compatibility: act/approval continue to use the legacy baseline metric.
      actualBottomMarginCm: baselineBottomMarginCm,
      baselineBottomMarginCm,

      // Report/order strict validation uses the visible lower edge of text.
      actualBottomTextGapCm,
      bottomMetric: "baseline_and_visible_text_bottom",
      lines,
      rawText: lines.map((line) => line.text).join("\n"),
    });
  }

  return pages;
};

const resolveMetric = (page, metricField) => {
  const value = Number(page?.[metricField]);
  return Number.isFinite(value) ? value : null;
};

const validateBottomMargins = (pages, options = {}) => {
  const minAllowedBottomMarginCm = Number(
    options.minAllowedBottomMarginCm ?? 1.9,
  );
  const maxAllowedBottomMarginCm = Number(
    options.maxAllowedBottomMarginCm ?? 2.1,
  );
  const metricField = options.metricField || "actualBottomMarginCm";
  const violations = [];

  for (const page of pages) {
    const actual = resolveMetric(page, metricField);
    if (actual == null) continue;

    if (actual < minAllowedBottomMarginCm) {
      violations.push({
        pageNumber: page.pageNumber,
        status: "below_min",
        severity: "unsafe",
        actualBottomMarginCm: actual,
        metricField,
        deviationCm: Number((minAllowedBottomMarginCm - actual).toFixed(2)),
      });
      continue;
    }

    // The last page may have an arbitrarily larger blank area.
    if (!page.isLastPage && actual > maxAllowedBottomMarginCm) {
      violations.push({
        pageNumber: page.pageNumber,
        status: "above_max",
        severity: "underfilled",
        actualBottomMarginCm: actual,
        metricField,
        deviationCm: Number((actual - maxAllowedBottomMarginCm).toFixed(2)),
      });
    }
  }

  return violations;
};

const validateEmptyLastPage = (pages, violations) => {
  const lastPage = pages[pages.length - 1];
  if (!lastPage) return;
  if (!lastPage.lines.some((line) => normalizeText(line.text))) {
    pushViolation(
      violations,
      "EMPTY_LAST_PAGE",
      "Є порожня остання сторінка",
      lastPage.pageNumber,
    );
  }
};

const detectSystemicBottomWhitespace = (pages, options = {}) => {
  const expectedBottomMarginCm = Number(options.expectedBottomMarginCm ?? 2.0);
  const thresholdCm = Number(options.thresholdCm ?? 2.1);
  const minShare = Number(options.minShare ?? 0.5);
  const metricField = options.metricField || "actualBottomMarginCm";
  const analyzablePages = pages.filter(
    (page) =>
      !page.isLastPage &&
      resolveMetric(page, metricField) != null &&
      page.lines.some((line) => normalizeText(line.text)),
  );

  if (!analyzablePages.length) {
    return {
      triggered: false,
      score: 0,
      expectedBottomMarginCm,
      thresholdCm,
      minShare,
      metricField,
      pagesOverThreshold: 0,
      pageCount: 0,
      share: 0,
      avgBottomMarginCm: null,
      maxBottomMarginCm: null,
      pages: [],
    };
  }

  const actuals = analyzablePages.map((page) => ({
    page,
    actual: resolveMetric(page, metricField),
  }));
  const over = actuals.filter(({ actual }) => actual > thresholdCm);
  const share = over.length / actuals.length;
  const average =
    actuals.reduce((sum, { actual }) => sum + actual, 0) / actuals.length;

  return {
    triggered: over.length > 0 && share >= minShare,
    score: Number(average.toFixed(2)),
    expectedBottomMarginCm,
    thresholdCm,
    minShare,
    metricField,
    pagesOverThreshold: over.length,
    pageCount: actuals.length,
    share: Number(share.toFixed(3)),
    avgBottomMarginCm: Number(average.toFixed(2)),
    maxBottomMarginCm: Number(
      Math.max(...actuals.map(({ actual }) => actual)).toFixed(2),
    ),
    pages: over.map(({ page, actual }) => ({
      pageNumber: page.pageNumber,
      actualBottomMarginCm: actual,
      deviationCm: Number((actual - thresholdCm).toFixed(2)),
    })),
  };
};

module.exports = {
  normalizeText,
  pushViolation,
  groupItemsToLines,
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
  detectSystemicBottomWhitespace,
};
