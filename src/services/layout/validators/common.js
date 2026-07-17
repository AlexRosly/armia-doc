const CM_IN_POINTS = 28.346;
const LINE_MERGE_THRESHOLD = 2;

const normalizeText = (value = "") =>
  String(value)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const pushViolation = (violations, code, message, page, meta = {}) => {
  violations.push({
    code,
    message,
    page,
    ...meta,
  });
};

const groupItemsToLines = (items = []) => {
  const textItems = items
    .filter((item) => normalizeText(item.str))
    .map((item) => ({
      text: item.str,
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .sort((a, b) => {
      if (Math.abs(b.y - a.y) > LINE_MERGE_THRESHOLD) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

  const rawLines = [];

  for (const item of textItems) {
    const line = rawLines.find(
      (entry) => Math.abs(entry.y - item.y) <= LINE_MERGE_THRESHOLD,
    );

    if (!line) {
      rawLines.push({
        y: item.y,
        items: [item],
      });
      continue;
    }

    line.items.push(item);
  }

  return rawLines
    .map((line, index) => {
      const sortedItems = line.items.sort((a, b) => a.x - b.x);
      return {
        index,
        y: line.y,
        text: normalizeText(sortedItems.map((item) => item.text).join(" ")),
      };
    })
    .filter((line) => line.text);
};

const detectBottomMarginStatus = (actualBottomMarginCm, isLastPage) => {
  if (actualBottomMarginCm == null) {
    return { status: "no_text", deviationCm: 0 };
  }

  if (isLastPage) {
    if (actualBottomMarginCm >= 2.4) {
      return { status: "last_page_allowed", deviationCm: 0 };
    }

    return {
      status: "below_min",
      deviationCm: Number((2.4 - actualBottomMarginCm).toFixed(2)),
    };
  }

  if (actualBottomMarginCm >= 2.4 && actualBottomMarginCm <= 2.6) {
    return { status: "target", deviationCm: 0 };
  }

  if (actualBottomMarginCm < 2.4) {
    return {
      status: "below_min",
      deviationCm: Number((2.4 - actualBottomMarginCm).toFixed(2)),
    };
  }

  return {
    status: "above_max",
    deviationCm: Number((actualBottomMarginCm - 2.6).toFixed(2)),
  };
};

const buildPagesFromPdf = async (pdf) => {
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines = groupItemsToLines(content.items);

    let lowestY = Infinity;
    content.items.forEach((item) => {
      const y = item.transform?.[5];
      if (typeof y === "number" && normalizeText(item.str) && y < lowestY) {
        lowestY = y;
      }
    });

    const actualBottomMarginCm =
      lowestY === Infinity ? null : Number((lowestY / CM_IN_POINTS).toFixed(2));

    const isLastPage = i === pdf.numPages;
    const { status, deviationCm } = detectBottomMarginStatus(
      actualBottomMarginCm,
      isLastPage,
    );

    pages.push({
      pageNumber: i,
      isLastPage,
      actualBottomMarginCm,
      status,
      deviationCm,
      lines,
      rawText: lines.map((line) => line.text).join("\n"),
    });
  }

  return pages;
};

const validateBottomMargins = (pages, violations) => {
  const marginViolations = [];

  for (const page of pages) {
    if (page.isLastPage) {
      if (page.status === "below_min" || page.status === "no_text") {
        marginViolations.push(page);
      }
      continue;
    }

    if (page.status !== "target") {
      marginViolations.push(page);
    }
  }

  return marginViolations;
};

const validateEmptyLastPage = (pages, violations) => {
  const lastPage = pages[pages.length - 1];
  if (!lastPage) return;

  const hasText = lastPage.lines.some((line) => normalizeText(line.text));
  if (!hasText) {
    pushViolation(
      violations,
      "EMPTY_LAST_PAGE",
      "Є порожня остання сторінка",
      lastPage.pageNumber,
    );
  }
};

module.exports = {
  normalizeText,
  pushViolation,
  groupItemsToLines,
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
};
