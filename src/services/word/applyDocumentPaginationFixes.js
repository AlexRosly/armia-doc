const fixSignatureTablePagination = require("./fixSignatureTablePagination");
const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
const fixReportProshuPagination = require("./fixReportProshuPagination");

const applyDocumentPaginationFixes = (buffer, options = {}) => {
  const { documentType } = options;

  let resultBuffer = buffer;

  if (documentType === "order" || documentType === "report") {
    resultBuffer = fixSignatureTablePagination(resultBuffer, {
      markerTexts: ["__SIGNATURE_START__"],
      previousParagraphCount: 2,
      removeMarkerParagraph: true,
    });
  }

  if (documentType === "order") {
    resultBuffer = fixOrderNakazuiuPagination(resultBuffer, {
      markerText: "НАКАЗУЮ:",
      keepWithNextParagraph: true,
    });
  }

  if (documentType === "report") {
    resultBuffer = fixReportProshuPagination(resultBuffer, {
      markerText: "ПРОШУ:",
      keepWithNextParagraph: true,
    });
  }

  return resultBuffer;
};

module.exports = applyDocumentPaginationFixes;
