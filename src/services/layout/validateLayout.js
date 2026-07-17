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
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
const {
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
  validateReportLayoutRules,
  validateOrderLayoutRules,
} = require("./validators");

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

  const marginViolations = validateBottomMargins(pages, hardViolations);

  return {
    pages,
    hardViolations,
    marginViolations,
    passed: hardViolations.length === 0 && marginViolations.length === 0,
  };
};

module.exports = validateLayout;
