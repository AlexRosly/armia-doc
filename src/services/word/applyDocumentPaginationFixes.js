// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");
// const fixSignatureTablePagination = require("./fixSignatureTablePagination");
// const normalizeHeaderPageNumber = require("./normalizeHeaderPageNumber");
// const setBodyWidowControl = require("./setBodyWidowControl");

// const ptToTwips = (pt) => Math.round(Number(pt) * 20);

// const resolveReportProshuSpacingAfterTwips = (options = {}) => {
//   const formatting = options.reportFormatting || {};
//   if (Number.isFinite(formatting.proshuSpacingAfterTwips)) {
//     return formatting.proshuSpacingAfterTwips;
//   }
//   if (Number.isFinite(formatting.proshuFontSizePt)) {
//     return ptToTwips(formatting.proshuFontSizePt * 2);
//   }
//   return null;
// };

// const applyDocumentPaginationFixes = (buffer, options = {}) => {
//   const { documentType } = options;
//   let result = buffer;

//   if (documentType === "order") {
//     // The 288 DOCX templates are the source of truth. Do not normalize styles,
//     // line spacing, docGrid, section margins or every paragraph property here.
//     result = setBodyWidowControl(result, {
//       startAfterTexts: ["НАКАЗ"],
//       stopBeforeTexts: ["__SIGNATURE_START__"],
//       enabled: false,
//     });
//     result = fixOrderNakazuiuPagination(result, {
//       markerText: "НАКАЗУЮ:",
//     });
//     result = fixOrderDirectiveSectionPagination(result, {
//       markerText: "НАКАЗУЮ:",
//       stopBeforeTable: true,
//       stopBeforeSignatureMarker: "__SIGNATURE_START__",
//     });
//     result = normalizeHeaderPageNumber(result);
//     result = fixSignatureTablePagination(result, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: true,
//     });
//   }

//   if (documentType === "report") {
//     const proshuSpacingAfterTwips = resolveReportProshuSpacingAfterTwips(options);
//     result = setBodyWidowControl(result, {
//       startAfterTexts: ["РАПОРТ"],
//       stopBeforeTexts: ["ПРОШУ:", "__SIGNATURE_START__"],
//       enabled: false,
//     });
//     result = fixReportProshuPagination(result, {
//       markerText: "ПРОШУ:",
//       previousContextText: "На підставі вищезазначеного,",
//       normalizeProshuSpacingAfter: Number.isFinite(proshuSpacingAfterTwips),
//       proshuSpacingAfterTwips,
//       removeEmptyParagraphsBetween: true,
//       stripPaginationFlagsFromIntermediate: true,
//     });
//     result = normalizeHeaderPageNumber(result);
//     result = fixSignatureTablePagination(result, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: false,
//     });
//   }

//   // Act and every unknown document type pass through unchanged.
//   return result;
// };

// module.exports = applyDocumentPaginationFixes;
const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
const fixReportProshuPagination = require("./fixReportProshuPagination");
const fixSignatureTablePagination = require("./fixSignatureTablePagination");
const normalizeHeaderPageNumber = require("./normalizeHeaderPageNumber");
const normalizeSectionLayout = require("./normalizeSectionLayout");
const setBodyWidowControl = require("./setBodyWidowControl");

const ptToTwips = (pt) => Math.round(Number(pt) * 20);

const resolveReportProshuSpacingAfterTwips = (options = {}) => {
  const formatting = options.reportFormatting || {};
  if (Number.isFinite(formatting.proshuSpacingAfterTwips)) {
    return formatting.proshuSpacingAfterTwips;
  }
  if (Number.isFinite(formatting.proshuFontSizePt)) {
    return ptToTwips(formatting.proshuFontSizePt * 2);
  }
  return null;
};

const applyDocumentPaginationFixes = (buffer, options = {}) => {
  const { documentType } = options;
  let result = buffer;

  if (documentType === "order") {
    // The 288 DOCX templates are the source of truth. Do not normalize styles,
    // line spacing, section margins or every paragraph property here.
    //
    // Word honors the template's 18 pt document grid while LibreOffice ignores
    // it during PDF conversion. Removing only w:docGrid keeps every template
    // spacing value intact and makes both renderers use the paragraph's own
    // w:spacing settings, preventing a one-line pagination drift in Word.
    result = normalizeSectionLayout(result, {
      removeDocGrid: true,
    });

    result = setBodyWidowControl(result, {
      startAfterTexts: ["НАКАЗ"],
      stopBeforeTexts: ["__SIGNATURE_START__"],
      enabled: false,
    });
    result = fixOrderNakazuiuPagination(result, {
      markerText: "НАКАЗУЮ:",
    });
    result = fixOrderDirectiveSectionPagination(result, {
      markerText: "НАКАЗУЮ:",
      stopBeforeTable: true,
      stopBeforeSignatureMarker: "__SIGNATURE_START__",
    });
    result = normalizeHeaderPageNumber(result);
    result = fixSignatureTablePagination(result, {
      markerTexts: ["__SIGNATURE_START__"],
      removeMarkerParagraph: true,
      orderTailMode: true,
    });
  }

  if (documentType === "report") {
    const proshuSpacingAfterTwips =
      resolveReportProshuSpacingAfterTwips(options);
    result = setBodyWidowControl(result, {
      startAfterTexts: ["РАПОРТ"],
      stopBeforeTexts: ["ПРОШУ:", "__SIGNATURE_START__"],
      enabled: false,
    });
    result = fixReportProshuPagination(result, {
      markerText: "ПРОШУ:",
      previousContextText: "На підставі вищезазначеного,",
      normalizeProshuSpacingAfter: Number.isFinite(proshuSpacingAfterTwips),
      proshuSpacingAfterTwips,
      removeEmptyParagraphsBetween: true,
      stripPaginationFlagsFromIntermediate: true,
    });
    result = normalizeHeaderPageNumber(result);
    result = fixSignatureTablePagination(result, {
      markerTexts: ["__SIGNATURE_START__"],
      removeMarkerParagraph: true,
      orderTailMode: false,
    });
  }

  // Act and every unknown document type pass through unchanged.
  return result;
};

module.exports = applyDocumentPaginationFixes;
