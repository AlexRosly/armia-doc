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
// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");
// const fixSignatureTablePagination = require("./fixSignatureTablePagination");

// const applyDocumentPaginationFixes = (buffer, options = {}) => {
//   const { documentType } = options;

//   let resultBuffer = buffer;

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

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: true,
//     });
//   }

//   if (documentType === "report") {
//     resultBuffer = fixReportProshuPagination(resultBuffer, {
//       markerText: "ПРОШУ:",
//       previousContextText: "На підставі вищезазначеного,",
//     });

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: false,
//     });
//   }

//   return resultBuffer;
// };

// module.exports = applyDocumentPaginationFixes;
// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");
// const fixSignatureTablePagination = require("./fixSignatureTablePagination");

// const applyDocumentPaginationFixes = (buffer, options = {}) => {
//   const { documentType } = options;

//   let resultBuffer = buffer;

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

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: true,
//     });
//   }

//   if (documentType === "report") {
//     resultBuffer = fixReportProshuPagination(resultBuffer, {
//       markerText: "ПРОШУ:",
//       previousContextText: "На підставі вищезазначеного,",
//       normalizeProshuSpacingAfter: true,
//       proshuSpacingAfterTwips: 120,
//       removeEmptyParagraphsBetween: true,
//       stripPaginationFlagsFromIntermediate: true,
//     });

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: false,
//     });
//   }

//   return resultBuffer;
// };

// module.exports = applyDocumentPaginationFixes;
// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");
// const fixSignatureTablePagination = require("./fixSignatureTablePagination");
// const normalizeHeaderPageNumber = require("./normalizeHeaderPageNumber");

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

//   let resultBuffer = buffer;

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

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: true,
//     });
//   }

//   if (documentType === "report") {
//     const proshuSpacingAfterTwips =
//       resolveReportProshuSpacingAfterTwips(options);

//     resultBuffer = fixReportProshuPagination(resultBuffer, {
//       markerText: "ПРОШУ:",
//       previousContextText: "На підставі вищезазначеного,",
//       normalizeProshuSpacingAfter: Number.isFinite(proshuSpacingAfterTwips),
//       proshuSpacingAfterTwips,
//       removeEmptyParagraphsBetween: true,
//       stripPaginationFlagsFromIntermediate: true,
//     });

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: false,
//     });
//   }

//   return resultBuffer;
// };

// module.exports = applyDocumentPaginationFixes;
// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");
// const fixSignatureTablePagination = require("./fixSignatureTablePagination");
// const normalizeHeaderPageNumber = require("./normalizeHeaderPageNumber");

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

//   let resultBuffer = buffer;

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

//     resultBuffer = normalizeHeaderPageNumber(resultBuffer);

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: true,
//     });
//   }

//   if (documentType === "report") {
//     const proshuSpacingAfterTwips =
//       resolveReportProshuSpacingAfterTwips(options);

//     resultBuffer = fixReportProshuPagination(resultBuffer, {
//       markerText: "ПРОШУ:",
//       previousContextText: "На підставі вищезазначеного,",
//       normalizeProshuSpacingAfter: Number.isFinite(proshuSpacingAfterTwips),
//       proshuSpacingAfterTwips,
//       removeEmptyParagraphsBetween: true,
//       stripPaginationFlagsFromIntermediate: true,
//     });

//     resultBuffer = normalizeHeaderPageNumber(resultBuffer);

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: false,
//     });
//   }

//   return resultBuffer;
// };

// module.exports = applyDocumentPaginationFixes;
// const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
// const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
// const fixReportProshuPagination = require("./fixReportProshuPagination");
// const fixSignatureTablePagination = require("./fixSignatureTablePagination");
// const normalizeHeaderPageNumber = require("./normalizeHeaderPageNumber");
// const normalizeDocumentParagraphPagination = require("./normalizeDocumentParagraphPagination");
// const normalizeDocumentParagraphSpacing = require("./normalizeDocumentParagraphSpacing");
// const normalizeSectionLayout = require("./normalizeSectionLayout");
// const normalizeStylesDefaultParagraph = require("./normalizeStylesDefaultParagraph");
// const normalizeAllParagraphStyles = require("./normalizeAllParagraphStyles");
// const tightenReportOpeningBlock = require("./tightenReportOpeningBlock");

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

//   let resultBuffer = buffer;

//   if (documentType === "order") {
//     resultBuffer = normalizeSectionLayout(resultBuffer, {
//       removeDocGrid: true,
//     });

//     resultBuffer = normalizeStylesDefaultParagraph(resultBuffer, {
//       setBeforeTwips: 0,
//       setAfterTwips: 0,
//       setLineTwips: 240,
//       setLineRule: "auto",
//       removeKeepNext: true,
//       removeKeepLines: true,
//       removeWidowControl: true,
//       removeSnapToGrid: true,
//       removeContextualSpacing: true,
//     });

//     resultBuffer = normalizeAllParagraphStyles(resultBuffer, {
//       setBeforeTwips: 0,
//       setAfterTwips: 0,
//       setLineTwips: 240,
//       setLineRule: "auto",
//       removeKeepNext: true,
//       removeKeepLines: true,
//       removeWidowControl: true,
//       removePageBreakBefore: true,
//       removeSnapToGrid: true,
//       removeContextualSpacing: true,
//       skipStyleIds: ["ae", "af0"],
//       skipStyleNames: ["header", "footer", "title", "subtitle"],
//     });

//     resultBuffer = normalizeDocumentParagraphPagination(resultBuffer, {
//       removeKeepNext: true,
//       removeKeepLines: true,
//       removePageBreakBefore: true,
//       removeWidowControl: true,
//       stopBeforeMarkerText: "__SIGNATURE_START__",
//     });

//     resultBuffer = fixOrderNakazuiuPagination(resultBuffer, {
//       markerText: "НАКАЗУЮ:",
//       keepWithNextParagraph: true,
//     });

//     resultBuffer = fixOrderDirectiveSectionPagination(resultBuffer, {
//       markerText: "НАКАЗУЮ:",
//       stopBeforeTable: true,
//       stopBeforeSignatureMarker: "__SIGNATURE_START__",
//     });

//     resultBuffer = normalizeHeaderPageNumber(resultBuffer);

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: true,
//     });
//   }

//   if (documentType === "report") {
//     resultBuffer = normalizeSectionLayout(resultBuffer, {
//       removeDocGrid: true,
//     });

//     resultBuffer = normalizeStylesDefaultParagraph(resultBuffer, {
//       setBeforeTwips: 0,
//       setAfterTwips: 0,
//       setLineTwips: 240,
//       setLineRule: "auto",
//       removeKeepNext: true,
//       removeKeepLines: true,
//       removeWidowControl: true,
//       removeSnapToGrid: true,
//       removeContextualSpacing: true,
//     });

//     resultBuffer = normalizeAllParagraphStyles(resultBuffer, {
//       setBeforeTwips: 0,
//       setAfterTwips: 0,
//       setLineTwips: 240,
//       setLineRule: "auto",
//       removeKeepNext: true,
//       removeKeepLines: true,
//       removeWidowControl: true,
//       removePageBreakBefore: true,
//       removeSnapToGrid: true,
//       removeContextualSpacing: true,
//       skipStyleIds: ["ae", "af0"],
//       skipStyleNames: ["header", "footer", "title", "subtitle"],
//     });

//     resultBuffer = normalizeDocumentParagraphPagination(resultBuffer, {
//       removeKeepNext: true,
//       removeKeepLines: true,
//       removePageBreakBefore: true,
//       removeWidowControl: true,
//       stopBeforeMarkerText: "__SIGNATURE_START__",
//     });

//     resultBuffer = normalizeDocumentParagraphSpacing(resultBuffer, {
//       stopBeforeMarkerText: "__SIGNATURE_START__",
//       removeSpacingBefore: true,
//       removeSpacingAfter: true,
//       removeLineSpacing: true,
//       removeSnapToGrid: true,
//       setSpacingBeforeTwips: 0,
//       setSpacingAfterTwips: 0,
//       skipExactTexts: ["РАПОРТ", "ПРОШУ:", "__SIGNATURE_START__"],
//       skipIfContainsTexts: ["НАКАЗУЮ:"],
//       skipEmptyParagraphs: true,
//     });

//     const proshuSpacingAfterTwips =
//       resolveReportProshuSpacingAfterTwips(options);

//     resultBuffer = fixReportProshuPagination(resultBuffer, {
//       markerText: "ПРОШУ:",
//       previousContextText: "На підставі вищезазначеного,",
//       normalizeProshuSpacingAfter: Number.isFinite(proshuSpacingAfterTwips),
//       proshuSpacingAfterTwips,
//       removeEmptyParagraphsBetween: true,
//       stripPaginationFlagsFromIntermediate: true,
//     });

//     resultBuffer = tightenReportOpeningBlock(resultBuffer, {
//       proshuText: "ПРОШУ:",
//       foundationText: "На підставі вищезазначеного,",
//       documentTitleText: "РАПОРТ",
//       signatureMarkerText: "__SIGNATURE_START__",
//       openingParagraphLimit: 80,
//       compactBeforeTwips: 0,
//       compactAfterTwips: 0,
//       compactLineTwips: 240,
//       foundationSpacingAfterTwips: Number.isFinite(proshuSpacingAfterTwips)
//         ? proshuSpacingAfterTwips
//         : null,
//       proshuSpacingAfterTwips: Number.isFinite(proshuSpacingAfterTwips)
//         ? proshuSpacingAfterTwips
//         : null,
//     });

//     resultBuffer = normalizeHeaderPageNumber(resultBuffer);

//     resultBuffer = fixSignatureTablePagination(resultBuffer, {
//       markerTexts: ["__SIGNATURE_START__"],
//       removeMarkerParagraph: true,
//       orderTailMode: true,
//     });
//   }

//   return resultBuffer;
// };

// module.exports = applyDocumentPaginationFixes;
// src/services/word/applyDocumentPaginationFixes.js
const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
const fixReportProshuPagination = require("./fixReportProshuPagination");
const fixSignatureTablePagination = require("./fixSignatureTablePagination");
const normalizeHeaderPageNumber = require("./normalizeHeaderPageNumber");
const normalizeDocumentParagraphPagination = require("./normalizeDocumentParagraphPagination");
const normalizeDocumentParagraphSpacing = require("./normalizeDocumentParagraphSpacing");
const normalizeSectionLayout = require("./normalizeSectionLayout");
const normalizeStylesDefaultParagraph = require("./normalizeStylesDefaultParagraph");
const normalizeAllParagraphStyles = require("./normalizeAllParagraphStyles");
const tightenReportOpeningBlock = require("./tightenReportOpeningBlock");
const tightenOrderOpeningBlock = require("./tightenOrderOpeningBlock");
const shrinkOrderPreNakazuiuTail = require("./shrinkOrderPreNakazuiuTail");

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

const resolveOrderNakazuiuSpacingTwips = (options = {}) => {
  const formatting = options.orderFormatting || {};

  if (Number.isFinite(formatting.nakazuiuSpacingTwips)) {
    return formatting.nakazuiuSpacingTwips;
  }

  if (Number.isFinite(formatting.nakazuiuFontSizePt)) {
    return ptToTwips(formatting.nakazuiuFontSizePt * 2);
  }

  return null;
};

const resolveOrderPreNakazuiuAfterTwips = (options = {}) => {
  const formatting = options.orderFormatting || {};

  if (Number.isFinite(formatting.preNakazuiuAfterTwips)) {
    return formatting.preNakazuiuAfterTwips;
  }

  return 0;
};

const applyDocumentPaginationFixes = (buffer, options = {}) => {
  const { documentType, orderTitleText = "" } = options;

  let resultBuffer = buffer;

  if (documentType === "order") {
    resultBuffer = normalizeSectionLayout(resultBuffer, {
      removeDocGrid: true,
    });

    resultBuffer = normalizeStylesDefaultParagraph(resultBuffer, {
      setBeforeTwips: 0,
      setAfterTwips: 0,
      setLineTwips: 240,
      setLineRule: "auto",
      removeKeepNext: true,
      removeKeepLines: true,
      removeWidowControl: true,
      removeSnapToGrid: true,
      removeContextualSpacing: true,
    });

    resultBuffer = normalizeAllParagraphStyles(resultBuffer, {
      setBeforeTwips: 0,
      setAfterTwips: 0,
      setLineTwips: 240,
      setLineRule: "auto",
      removeKeepNext: true,
      removeKeepLines: true,
      removeWidowControl: true,
      removePageBreakBefore: true,
      removeSnapToGrid: true,
      removeContextualSpacing: true,
      skipStyleIds: ["ae", "af0"],
      skipStyleNames: ["header", "footer", "title", "subtitle"],
    });

    resultBuffer = normalizeDocumentParagraphPagination(resultBuffer, {
      removeKeepNext: true,
      removeKeepLines: true,
      removePageBreakBefore: true,
      removeWidowControl: true,
      stopBeforeMarkerText: "__SIGNATURE_START__",
      startAfterMarkerText: orderTitleText,
    });

    const nakazuiuSpacingTwips = resolveOrderNakazuiuSpacingTwips(options);
    const preNakazuiuAfterTwips = resolveOrderPreNakazuiuAfterTwips(options);

    resultBuffer = fixOrderNakazuiuPagination(resultBuffer, {
      markerText: "НАКАЗУЮ:",
      keepWithNextParagraph: true,
    });

    resultBuffer = fixOrderDirectiveSectionPagination(resultBuffer, {
      markerText: "НАКАЗУЮ:",
      stopBeforeTable: true,
      stopBeforeSignatureMarker: "__SIGNATURE_START__",
    });

    resultBuffer = shrinkOrderPreNakazuiuTail(resultBuffer, {
      markerText: "НАКАЗУЮ:",
      signatureMarkerText: "__SIGNATURE_START__",
      protectedBeforeText: orderTitleText,
      lineTwips: 240,
      targetAfterTwips: preNakazuiuAfterTwips,
    });

    // Пока оставляем отключённым, потому что он концептуально лезет в opening block.
    // Если понадобится, потом отдельно сузим его диапазон.
    // resultBuffer = tightenOrderOpeningBlock(resultBuffer, {
    //   nakazuiuText: "НАКАЗУЮ:",
    //   signatureMarkerText: "__SIGNATURE_START__",
    //   lineTwips: 240,
    //   nakazuiuBeforeTwips: Number.isFinite(nakazuiuSpacingTwips)
    //     ? nakazuiuSpacingTwips
    //     : 480,
    //   nakazuiuAfterTwips: 0,
    //   directiveFirstParagraphBeforeTwips: Number.isFinite(nakazuiuSpacingTwips)
    //     ? nakazuiuSpacingTwips
    //     : 480,
    //   directiveFirstParagraphAfterTwips: 0,
    // });

    void nakazuiuSpacingTwips;

    resultBuffer = normalizeHeaderPageNumber(resultBuffer);

    resultBuffer = fixSignatureTablePagination(resultBuffer, {
      markerTexts: ["__SIGNATURE_START__"],
      removeMarkerParagraph: true,
      orderTailMode: true,
    });
  }

  if (documentType === "report") {
    resultBuffer = normalizeSectionLayout(resultBuffer, {
      removeDocGrid: true,
    });

    resultBuffer = normalizeStylesDefaultParagraph(resultBuffer, {
      setBeforeTwips: 0,
      setAfterTwips: 0,
      setLineTwips: 240,
      setLineRule: "auto",
      removeKeepNext: true,
      removeKeepLines: true,
      removeWidowControl: true,
      removeSnapToGrid: true,
      removeContextualSpacing: true,
    });

    resultBuffer = normalizeAllParagraphStyles(resultBuffer, {
      setBeforeTwips: 0,
      setAfterTwips: 0,
      setLineTwips: 240,
      setLineRule: "auto",
      removeKeepNext: true,
      removeKeepLines: true,
      removeWidowControl: true,
      removePageBreakBefore: true,
      removeSnapToGrid: true,
      removeContextualSpacing: true,
      skipStyleIds: ["ae", "af0"],
      skipStyleNames: ["header", "footer", "title", "subtitle"],
    });

    resultBuffer = normalizeDocumentParagraphPagination(resultBuffer, {
      removeKeepNext: true,
      removeKeepLines: true,
      removePageBreakBefore: true,
      removeWidowControl: true,
      stopBeforeMarkerText: "__SIGNATURE_START__",
    });

    resultBuffer = normalizeDocumentParagraphSpacing(resultBuffer, {
      stopBeforeMarkerText: "__SIGNATURE_START__",
      removeSpacingBefore: true,
      removeSpacingAfter: true,
      removeLineSpacing: true,
      removeSnapToGrid: true,
      setSpacingBeforeTwips: 0,
      setSpacingAfterTwips: 0,
      skipExactTexts: ["РАПОРТ", "ПРОШУ:", "__SIGNATURE_START__"],
      skipIfContainsTexts: ["НАКАЗУЮ:"],
      skipEmptyParagraphs: true,
    });

    const proshuSpacingAfterTwips =
      resolveReportProshuSpacingAfterTwips(options);

    resultBuffer = fixReportProshuPagination(resultBuffer, {
      markerText: "ПРОШУ:",
      previousContextText: "На підставі вищезазначеного,",
      normalizeProshuSpacingAfter: Number.isFinite(proshuSpacingAfterTwips),
      proshuSpacingAfterTwips,
      removeEmptyParagraphsBetween: true,
      stripPaginationFlagsFromIntermediate: true,
    });

    resultBuffer = tightenReportOpeningBlock(resultBuffer, {
      proshuText: "ПРОШУ:",
      foundationText: "На підставі вищезазначеного,",
      documentTitleText: "РАПОРТ",
      signatureMarkerText: "__SIGNATURE_START__",
      openingParagraphLimit: 80,
      compactBeforeTwips: 0,
      compactAfterTwips: 0,
      compactLineTwips: 240,
      foundationSpacingAfterTwips: Number.isFinite(proshuSpacingAfterTwips)
        ? proshuSpacingAfterTwips
        : null,
      proshuSpacingAfterTwips: Number.isFinite(proshuSpacingAfterTwips)
        ? proshuSpacingAfterTwips
        : null,
    });

    resultBuffer = normalizeHeaderPageNumber(resultBuffer);

    resultBuffer = fixSignatureTablePagination(resultBuffer, {
      markerTexts: ["__SIGNATURE_START__"],
      removeMarkerParagraph: true,
      orderTailMode: true,
    });
  }

  return resultBuffer;
};

module.exports = applyDocumentPaginationFixes;
