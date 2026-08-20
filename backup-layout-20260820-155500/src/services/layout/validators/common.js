// const CM_IN_POINTS = 28.346;
// const LINE_MERGE_THRESHOLD = 2;

// const normalizeText = (value = "") =>
//   String(value)
//     .replace(/\u00A0/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();

// const pushViolation = (violations, code, message, page, meta = {}) => {
//   violations.push({
//     code,
//     message,
//     page,
//     ...meta,
//   });
// };

// const groupItemsToLines = (items = []) => {
//   const textItems = items
//     .filter((item) => normalizeText(item.str))
//     .map((item) => ({
//       text: item.str,
//       x: item.transform?.[4] ?? 0,
//       y: item.transform?.[5] ?? 0,
//     }))
//     .sort((a, b) => {
//       if (Math.abs(b.y - a.y) > LINE_MERGE_THRESHOLD) {
//         return b.y - a.y;
//       }
//       return a.x - b.x;
//     });

//   const rawLines = [];

//   for (const item of textItems) {
//     const line = rawLines.find(
//       (entry) => Math.abs(entry.y - item.y) <= LINE_MERGE_THRESHOLD,
//     );

//     if (!line) {
//       rawLines.push({
//         y: item.y,
//         items: [item],
//       });
//       continue;
//     }

//     line.items.push(item);
//   }

//   return rawLines
//     .map((line, index) => {
//       const sortedItems = line.items.sort((a, b) => a.x - b.x);
//       return {
//         index,
//         y: line.y,
//         text: normalizeText(sortedItems.map((item) => item.text).join(" ")),
//       };
//     })
//     .filter((line) => line.text);
// };

// const detectBottomMarginStatus = (actualBottomMarginCm, isLastPage) => {
//   if (actualBottomMarginCm == null) {
//     return { status: "no_text", deviationCm: 0 };
//   }

//   if (isLastPage) {
//     if (actualBottomMarginCm >= 2.4) {
//       return { status: "last_page_allowed", deviationCm: 0 };
//     }

//     return {
//       status: "below_min",
//       deviationCm: Number((2.4 - actualBottomMarginCm).toFixed(2)),
//     };
//   }

//   if (actualBottomMarginCm >= 2.4 && actualBottomMarginCm <= 2.6) {
//     return { status: "target", deviationCm: 0 };
//   }

//   if (actualBottomMarginCm < 2.4) {
//     return {
//       status: "below_min",
//       deviationCm: Number((2.4 - actualBottomMarginCm).toFixed(2)),
//     };
//   }

//   return {
//     status: "above_max",
//     deviationCm: Number((actualBottomMarginCm - 2.6).toFixed(2)),
//   };
// };

// const buildPagesFromPdf = async (pdf) => {
//   const pages = [];

//   for (let i = 1; i <= pdf.numPages; i++) {
//     const page = await pdf.getPage(i);
//     const content = await page.getTextContent();
//     const lines = groupItemsToLines(content.items);

//     let lowestY = Infinity;
//     content.items.forEach((item) => {
//       const y = item.transform?.[5];
//       if (typeof y === "number" && normalizeText(item.str) && y < lowestY) {
//         lowestY = y;
//       }
//     });

//     const actualBottomMarginCm =
//       lowestY === Infinity ? null : Number((lowestY / CM_IN_POINTS).toFixed(2));

//     const isLastPage = i === pdf.numPages;
//     const { status, deviationCm } = detectBottomMarginStatus(
//       actualBottomMarginCm,
//       isLastPage,
//     );

//     pages.push({
//       pageNumber: i,
//       isLastPage,
//       actualBottomMarginCm,
//       status,
//       deviationCm,
//       lines,
//       rawText: lines.map((line) => line.text).join("\n"),
//     });
//   }

//   return pages;
// };

// const validateBottomMargins = (pages, violations) => {
//   const marginViolations = [];

//   for (const page of pages) {
//     if (page.isLastPage) {
//       if (page.status === "below_min" || page.status === "no_text") {
//         marginViolations.push(page);
//       }
//       continue;
//     }

//     if (page.status !== "target") {
//       marginViolations.push(page);
//     }
//   }

//   return marginViolations;
// };

// const validateEmptyLastPage = (pages, violations) => {
//   const lastPage = pages[pages.length - 1];
//   if (!lastPage) return;

//   const hasText = lastPage.lines.some((line) => normalizeText(line.text));
//   if (!hasText) {
//     pushViolation(
//       violations,
//       "EMPTY_LAST_PAGE",
//       "Є порожня остання сторінка",
//       lastPage.pageNumber,
//     );
//   }
// };

// module.exports = {
//   normalizeText,
//   pushViolation,
//   groupItemsToLines,
//   buildPagesFromPdf,
//   validateBottomMargins,
//   validateEmptyLastPage,
// };
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
      width: Number(item.width || 0),
      height: Number(item.height || 0),
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
        items: sortedItems,
      };
    })
    .filter((line) => line.text);
};

const buildPagesFromPdf = async (pdf) => {
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
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

    pages.push({
      pageNumber: i,
      isLastPage: i === pdf.numPages,
      width: viewport.width,
      height: viewport.height,
      actualBottomMarginCm,
      lines,
      rawText: lines.map((line) => line.text).join("\n"),
    });
  }

  return pages;
};

// const validateBottomMargins = (pages, options = {}) => {
//   const minAllowedBottomMarginCm = Number(
//     options.minAllowedBottomMarginCm ?? 1.9,
//   );
//   const maxAllowedBottomMarginCm = Number(
//     options.maxAllowedBottomMarginCm ?? 3.5,
//   );

//   const violations = [];

//   for (const page of pages) {
//     if (page.actualBottomMarginCm == null) {
//       if (page.isLastPage) {
//         violations.push({
//           pageNumber: page.pageNumber,
//           status: "no_text",
//           actualBottomMarginCm: null,
//           deviationCm: 0,
//         });
//       }
//       continue;
//     }

//     if (page.actualBottomMarginCm < minAllowedBottomMarginCm) {
//       violations.push({
//         pageNumber: page.pageNumber,
//         status: "below_min",
//         actualBottomMarginCm: page.actualBottomMarginCm,
//         deviationCm: Number(
//           (minAllowedBottomMarginCm - page.actualBottomMarginCm).toFixed(2),
//         ),
//       });
//       continue;
//     }

//     if (
//       !page.isLastPage &&
//       page.actualBottomMarginCm > maxAllowedBottomMarginCm
//     ) {
//       violations.push({
//         pageNumber: page.pageNumber,
//         status: "above_max",
//         actualBottomMarginCm: page.actualBottomMarginCm,
//         deviationCm: Number(
//           (page.actualBottomMarginCm - maxAllowedBottomMarginCm).toFixed(2),
//         ),
//       });
//     }
//   }

//   return violations;
// };

const validateBottomMargins = (pages, options = {}) => {
  const minAllowedBottomMarginCm = Number(
    options.minAllowedBottomMarginCm ?? 1.9,
  );

  // Здесь верхнюю границу держим мягкой.
  // Системный завышенный хвост отдельно детектится через
  // detectSystemicBottomWhitespace(...).
  const maxAllowedBottomMarginCm = Number(
    options.maxAllowedBottomMarginCm ?? 3.2,
  );

  const violations = [];

  for (const page of pages) {
    if (page.actualBottomMarginCm == null) {
      if (page.isLastPage) {
        violations.push({
          pageNumber: page.pageNumber,
          status: "no_text",
          actualBottomMarginCm: null,
          deviationCm: 0,
        });
      }
      continue;
    }

    // Слишком маленький нижний отступ — это реальная проблема:
    // текст слишком низко прижат к низу страницы.
    if (page.actualBottomMarginCm < minAllowedBottomMarginCm) {
      violations.push({
        pageNumber: page.pageNumber,
        status: "below_min",
        actualBottomMarginCm: page.actualBottomMarginCm,
        deviationCm: Number(
          (minAllowedBottomMarginCm - page.actualBottomMarginCm).toFixed(2),
        ),
      });
      continue;
    }

    // Слишком большой нижний отступ фиксируем только как мягкое
    // отклонение на непоследних страницах.
    // Основное решение по системному хвосту принимает
    // detectSystemicBottomWhitespace.
    if (
      !page.isLastPage &&
      page.actualBottomMarginCm > maxAllowedBottomMarginCm
    ) {
      violations.push({
        pageNumber: page.pageNumber,
        status: "above_max",
        actualBottomMarginCm: page.actualBottomMarginCm,
        deviationCm: Number(
          (page.actualBottomMarginCm - maxAllowedBottomMarginCm).toFixed(2),
        ),
      });
    }
  }

  return violations;
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

// const detectSystemicBottomWhitespace = (pages, options = {}) => {
//   const expectedBottomMarginCm = Number(options.expectedBottomMarginCm ?? 2.0);

//   const thresholdCm = Number(
//     options.thresholdCm ?? Math.max(expectedBottomMarginCm + 0.8, 2.8),
//   );

//   const minShare = Number(options.minShare ?? 0.5);

//   const analyzablePages = pages.filter(
//     (page) =>
//       !page.isLastPage &&
//       page.actualBottomMarginCm != null &&
//       page.lines.some((line) => normalizeText(line.text)),
//   );

//   if (!analyzablePages.length) {
//     return {
//       triggered: false,
//       score: 0,
//       expectedBottomMarginCm,
//       thresholdCm,
//       minShare,
//       pagesOverThreshold: 0,
//       pageCount: 0,
//       share: 0,
//       avgBottomMarginCm: null,
//       maxBottomMarginCm: null,
//       pages: [],
//     };
//   }

//   const pagesOverThreshold = analyzablePages.filter(
//     (page) => page.actualBottomMarginCm > thresholdCm,
//   );

//   const share = pagesOverThreshold.length / analyzablePages.length;

//   const avgBottomMarginCm =
//     analyzablePages.reduce(
//       (sum, page) => sum + Number(page.actualBottomMarginCm || 0),
//       0,
//     ) / analyzablePages.length;

//   const maxBottomMarginCm = Math.max(
//     ...analyzablePages.map((page) => Number(page.actualBottomMarginCm || 0)),
//   );

//   return {
//     triggered: share >= minShare,
//     score: Number(avgBottomMarginCm.toFixed(2)),
//     expectedBottomMarginCm,
//     thresholdCm,
//     minShare,
//     pagesOverThreshold: pagesOverThreshold.length,
//     pageCount: analyzablePages.length,
//     share: Number(share.toFixed(3)),
//     avgBottomMarginCm: Number(avgBottomMarginCm.toFixed(2)),
//     maxBottomMarginCm: Number(maxBottomMarginCm.toFixed(2)),
//     pages: pagesOverThreshold.map((page) => ({
//       pageNumber: page.pageNumber,
//       actualBottomMarginCm: page.actualBottomMarginCm,
//       deviationCm: Number((page.actualBottomMarginCm - thresholdCm).toFixed(2)),
//     })),
//   };
// };

const detectSystemicBottomWhitespace = (pages, options = {}) => {
  const expectedBottomMarginCm = Number(options.expectedBottomMarginCm ?? 2.0);

  // Раньше порог был слишком мягкий.
  // Теперь считаем системным хвостом всё, что стабильно заметно выше
  // ожидаемого поля 2.0 см.
  const thresholdCm = Number(
    options.thresholdCm ?? Math.max(expectedBottomMarginCm + 0.4, 2.2),
  );

  const minShare = Number(options.minShare ?? 0.5);

  const analyzablePages = pages.filter(
    (page) =>
      !page.isLastPage &&
      page.actualBottomMarginCm != null &&
      page.lines.some((line) => normalizeText(line.text)),
  );

  if (!analyzablePages.length) {
    return {
      triggered: false,
      score: 0,
      expectedBottomMarginCm,
      thresholdCm,
      minShare,
      pagesOverThreshold: 0,
      pageCount: 0,
      share: 0,
      avgBottomMarginCm: null,
      maxBottomMarginCm: null,
      pages: [],
    };
  }

  const pagesOverThreshold = analyzablePages.filter(
    (page) => page.actualBottomMarginCm > thresholdCm,
  );

  const share = pagesOverThreshold.length / analyzablePages.length;

  const avgBottomMarginCm =
    analyzablePages.reduce(
      (sum, page) => sum + Number(page.actualBottomMarginCm || 0),
      0,
    ) / analyzablePages.length;

  const maxBottomMarginCm = Math.max(
    ...analyzablePages.map((page) => Number(page.actualBottomMarginCm || 0)),
  );

  return {
    triggered: share >= minShare,
    score: Number(avgBottomMarginCm.toFixed(2)),
    expectedBottomMarginCm,
    thresholdCm,
    minShare,
    pagesOverThreshold: pagesOverThreshold.length,
    pageCount: analyzablePages.length,
    share: Number(share.toFixed(3)),
    avgBottomMarginCm: Number(avgBottomMarginCm.toFixed(2)),
    maxBottomMarginCm: Number(maxBottomMarginCm.toFixed(2)),
    pages: pagesOverThreshold.map((page) => ({
      pageNumber: page.pageNumber,
      actualBottomMarginCm: page.actualBottomMarginCm,
      deviationCm: Number((page.actualBottomMarginCm - thresholdCm).toFixed(2)),
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
