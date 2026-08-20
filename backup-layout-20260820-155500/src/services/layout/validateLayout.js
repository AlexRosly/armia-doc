// // // const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

// // // async function validateLayout(pdfPath) {
// // //   const pdf = await pdfjs.getDocument(pdfPath).promise;

// // //   const pages = [];

// // //   for (let i = 1; i <= pdf.numPages; i++) {
// // //     const page = await pdf.getPage(i);

// // //     const content = await page.getTextContent();

// // //     let lowestY = Infinity;

// // //     content.items.forEach((item) => {
// // //       const y = item.transform[5];

// // //       lowestY = Math.min(lowestY, y);
// // //     });

// // //     pages.push({
// // //       pageNumber: i,
// // //       lowestY,
// // //     });
// // //   }

// // //   return pages;
// // // }
// // // const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

// // // const validateLayout = async (pdfPath) => {
// // //   const pdf = await pdfjs.getDocument(pdfPath).promise;

// // //   const pages = [];

// // //   for (let i = 1; i <= pdf.numPages; i++) {
// // //     const page = await pdf.getPage(i);

// // //     const content = await page.getTextContent();

// // //     let lowestY = Infinity;

// // //     content.items.forEach((item) => {
// // //       const y = item.transform[5];

// // //       lowestY = Math.min(lowestY, y);
// // //     });

// // //     pages.push({
// // //       pageNumber: i,
// // //       lowestY,
// // //     });
// // //   }

// // //   return pages;
// // // };
// // const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

// // const CM_IN_POINTS = 28.346;

// // const validateLayout = async (pdfPath) => {
// //   const pdf = await pdfjs.getDocument(pdfPath).promise;

// //   const pages = [];

// //   for (let i = 1; i <= pdf.numPages; i++) {
// //     const page = await pdf.getPage(i);

// //     const content = await page.getTextContent();

// //     let lowestY = Infinity;

// //     content.items.forEach((item) => {
// //       const y = item.transform[5];

// //       if (y < lowestY) {
// //         lowestY = y;
// //       }
// //     });

// //     const actualBottomMarginCm = Number((lowestY / CM_IN_POINTS).toFixed(2));

// //     const isLastPage = i === pdf.numPages;

// //     let status = "target";
// //     let deviationCm = 0;

// //     if (isLastPage) {
// //       if (actualBottomMarginCm >= 2.4) {
// //         status = "last_page_allowed";
// //       } else {
// //         status = "below_min";
// //         deviationCm = Number((2.4 - actualBottomMarginCm).toFixed(2));
// //       }
// //     } else {
// //       if (actualBottomMarginCm >= 2.4 && actualBottomMarginCm <= 2.6) {
// //         status = "target";
// //       } else if (actualBottomMarginCm < 2.4) {
// //         status = "below_min";

// //         deviationCm = Number((2.4 - actualBottomMarginCm).toFixed(2));
// //       } else {
// //         status = "above_max";

// //         deviationCm = Number((actualBottomMarginCm - 2.6).toFixed(2));
// //       }
// //     }

// //     pages.push({
// //       pageNumber: i,
// //       actualBottomMarginCm,
// //       status,
// //       deviationCm,
// //     });
// //   }

// //   return pages;
// // };

// // module.exports = validateLayout;
// const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

// const CM_IN_POINTS = 28.346;

// const validateLayout = async (pdfPath) => {
//   const pdf = await pdfjs.getDocument(pdfPath).promise;

//   const pages = [];

//   for (let i = 1; i <= pdf.numPages; i++) {
//     const page = await pdf.getPage(i);
//     const content = await page.getTextContent();

//     let lowestY = Infinity;

//     content.items.forEach((item) => {
//       const y = item.transform?.[5];

//       if (typeof y === "number" && y < lowestY) {
//         lowestY = y;
//       }
//     });

//     const actualBottomMarginCm =
//       lowestY === Infinity ? null : Number((lowestY / CM_IN_POINTS).toFixed(2));

//     const isLastPage = i === pdf.numPages;

//     let status = "target";
//     let deviationCm = 0;

//     if (actualBottomMarginCm == null) {
//       status = "no_text";
//     } else if (isLastPage) {
//       if (actualBottomMarginCm >= 2.4) {
//         status = "last_page_allowed";
//       } else {
//         status = "below_min";
//         deviationCm = Number((2.4 - actualBottomMarginCm).toFixed(2));
//       }
//     } else {
//       if (actualBottomMarginCm >= 2.4 && actualBottomMarginCm <= 2.6) {
//         status = "target";
//       } else if (actualBottomMarginCm < 2.4) {
//         status = "below_min";
//         deviationCm = Number((2.4 - actualBottomMarginCm).toFixed(2));
//       } else {
//         status = "above_max";
//         deviationCm = Number((actualBottomMarginCm - 2.6).toFixed(2));
//       }
//     }

//     pages.push({
//       pageNumber: i,
//       actualBottomMarginCm,
//       status,
//       deviationCm,
//     });
//   }

//   return pages;
// };

// module.exports = validateLayout;
// const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
// const {
//   buildPagesFromPdf,
//   validateBottomMargins,
//   validateEmptyLastPage,
//   validateReportLayoutRules,
//   validateOrderLayoutRules,
// } = require("./validators");

// const validateLayout = async (pdfPath, context = {}) => {
//   const pdf = await pdfjs.getDocument(pdfPath).promise;
//   const pages = await buildPagesFromPdf(pdf);
//   const hardViolations = [];

//   validateEmptyLastPage(pages, hardViolations);

//   switch (context.documentType) {
//     case "report":
//       validateReportLayoutRules(pages, context, hardViolations);
//       break;

//     case "order":
//       validateOrderLayoutRules(pages, context, hardViolations);
//       break;

//     case "act":
//     default:
//       break;
//   }

//   const marginViolations = validateBottomMargins(pages, hardViolations);

//   return {
//     pages,
//     hardViolations,
//     marginViolations,
//     passed: hardViolations.length === 0 && marginViolations.length === 0,
//   };
// };

// module.exports = validateLayout;
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

const buildLayoutFlags = (documentType, hardViolations) => {
  if (documentType === "report") {
    return {
      proshuOk:
        !hasViolationCode(hardViolations, "PROSHU_LAST_LINE") &&
        !hasViolationCode(hardViolations, "PROSHU_NOT_ENOUGH_LINES_AFTER") &&
        !hasViolationCode(hardViolations, "PROSHU_BLOCK_ORPHANED") &&
        !hasViolationCode(hardViolations, "FOUNDATION_PHRASE_HANGING"),
      nakazuiuOk: null,
      signatureOk:
        !hasViolationCode(hardViolations, "SIGNATURE_BLOCK_SPLIT") &&
        !hasViolationCode(hardViolations, "SIGNATURE_WITHOUT_CONTEXT") &&
        !hasViolationCode(hardViolations, "SIGN_DATE_DETACHED"),
    };
  }

  if (documentType === "order") {
    return {
      proshuOk: null,
      nakazuiuOk:
        !hasViolationCode(hardViolations, "NAKAZUIU_LAST_LINE") &&
        !hasViolationCode(hardViolations, "NAKAZUIU_NOT_ENOUGH_LINES_AFTER"),
      signatureOk:
        !hasViolationCode(hardViolations, "ORDER_SIGNATURE_BLOCK_SPLIT") &&
        !hasViolationCode(hardViolations, "ORDER_SIGNATURE_WITHOUT_CONTEXT") &&
        !hasViolationCode(hardViolations, "ORDER_SIGNATURE_ORPHAN_LAST_PAGE"),
    };
  }

  return {
    proshuOk: null,
    nakazuiuOk: null,
    signatureOk: null,
  };
};

const validateLayout = async (pdfPath, context = {}) => {
  const pdf = await pdfjs.getDocument(pdfPath).promise;
  const pages = await buildPagesFromPdf(pdf);
  const hardViolations = [];

  validateEmptyLastPage(pages, hardViolations);

  switch (context.documentType) {
    case "report":
      validateReportLayoutRules(pages, context, hardViolations);
      break;

    case "order":
      validateOrderLayoutRules(pages, context, hardViolations);
      break;

    case "act":
    default:
      break;
  }

  const marginViolations = validateBottomMargins(pages, {
    expectedBottomMarginCm:
      context.expectedBottomMarginCm != null
        ? Number(context.expectedBottomMarginCm)
        : 2.0,

    minAllowedBottomMarginCm:
      context.minAllowedBottomMarginCm != null
        ? Number(context.minAllowedBottomMarginCm)
        : 1.9,

    // Верхнюю границу делаем мягче, чтобы не конфликтовать с отдельным
    // детектором системного хвоста
    maxAllowedBottomMarginCm:
      context.maxAllowedBottomMarginCm != null
        ? Number(context.maxAllowedBottomMarginCm)
        : 3.2,
  });

  const systemicWhitespace = detectSystemicBottomWhitespace(pages, {
    expectedBottomMarginCm:
      context.expectedBottomMarginCm != null
        ? Number(context.expectedBottomMarginCm)
        : 2.0,

    // Было 2.8 — это многовато. Делаем ближе к реальному ожиданию.
    thresholdCm:
      context.systemicWhitespaceThresholdCm != null
        ? Number(context.systemicWhitespaceThresholdCm)
        : 2.2,

    minShare:
      context.systemicWhitespaceMinShare != null
        ? Number(context.systemicWhitespaceMinShare)
        : 0.5,
  });

  const layoutFlags = buildLayoutFlags(context.documentType, hardViolations);

  return {
    pages,
    hardViolations,
    marginViolations,
    systemicWhitespace,
    layoutFlags,
    passed: hardViolations.length === 0 && marginViolations.length === 0,
  };
};

module.exports = validateLayout;
