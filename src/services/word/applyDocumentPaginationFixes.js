// const fixSignatureTablePagination = require("./fixSignatureTablePagination");
// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");

// const applyDocumentPaginationFixes = (buffer, options = {}) => {
//   const { documentType } = options;

//   let resultBuffer = buffer;

//   if (documentType === "order" || documentType === "report") {
//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       previousParagraphCount: 2,
//       removeMarkerParagraph: true,
//     });
//   }

//   if (documentType === "order") {
//     resultBuffer = fixOrderNakazuiuPagination(resultBuffer, {
//       markerText: "НАКАЗУЮ:",
//       keepWithNextParagraph: true,
//     });
//   }

//   if (documentType === "report") {
//     resultBuffer = fixReportProshuPagination(resultBuffer, {
//       markerText: "ПРОШУ:",
//       keepWithNextParagraph: true,
//     });
//   }

//   return resultBuffer;
// };

// module.exports = applyDocumentPaginationFixes;
// const fixSignatureTablePagination = require("./fixSignatureTablePagination");
// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");

// const applyDocumentPaginationFixes = (buffer, options = {}) => {
//   const { documentType } = options;

//   let resultBuffer = buffer;

//   if (documentType === "order" || documentType === "report") {
//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       previousParagraphCount: 2,
//       removeMarkerParagraph: true,
//     });
//   }

//   if (documentType === "order") {
//     resultBuffer = fixOrderNakazuiuPagination(resultBuffer, {
//       markerText: "НАКАЗУЮ:",
//       keepWithNextParagraph: true,
//     });

//     resultBuffer = fixOrderDirectiveSectionPagination(resultBuffer, {
//       markerText: "НАКАЗУЮ:",
//       stopBeforeTable: true,
//       stopBeforeSignatureMarker: "__SIGNATURE_START__",
//     });
//   }

//   if (documentType === "report") {
//     resultBuffer = fixReportProshuPagination(resultBuffer, {
//       markerText: "ПРОШУ:",
//       previousContextText: "На підставі вищезазначеного,",
//     });
//   }

//   return resultBuffer;
// };

// module.exports = applyDocumentPaginationFixes;
const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
const fixReportProshuPagination = require("./fixReportProshuPagination");
const fixSignatureTablePagination = require("./fixSignatureTablePagination");

const applyDocumentPaginationFixes = (buffer, options = {}) => {
  const { documentType } = options;

  let resultBuffer = buffer;

  if (documentType === "order") {
    resultBuffer = fixOrderNakazuiuPagination(resultBuffer, {
      markerText: "НАКАЗУЮ:",
      keepWithNextParagraph: true,
    });

    resultBuffer = fixOrderDirectiveSectionPagination(resultBuffer, {
      markerText: "НАКАЗУЮ:",
      stopBeforeTable: true,
      stopBeforeSignatureMarker: "__SIGNATURE_START__",
    });

    resultBuffer = fixSignatureTablePagination(resultBuffer, {
      markerTexts: ["__SIGNATURE_START__"],
      removeMarkerParagraph: true,
      orderTailMode: true,
    });
  }

  if (documentType === "report") {
    resultBuffer = fixReportProshuPagination(resultBuffer, {
      markerText: "ПРОШУ:",
      previousContextText: "На підставі вищезазначеного,",
    });

    resultBuffer = fixSignatureTablePagination(resultBuffer, {
      markerTexts: ["__SIGNATURE_START__"],
      removeMarkerParagraph: true,
      orderTailMode: false,
    });
  }

  return resultBuffer;
};

module.exports = applyDocumentPaginationFixes;
