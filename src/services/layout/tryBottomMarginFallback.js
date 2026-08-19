// const fs = require("fs/promises");
// const path = require("path");

// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const setSectionBottomMargin = require("../word/setSectionBottomMargin");

// const ALT_BOTTOM_TWIPS = 1077;

// const formatSignerDate = (value) => {
//   if (!value) return "";

//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) {
//     return "";
//   }

//   return date.toLocaleDateString("uk-UA", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   });
// };

// const buildValidationContext = (payload) => {
//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
//       markers: {
//         proshu: "ПРОШУ:",
//         foundationPhrase: "На підставі вищезазначеного,",
//         signerPosition: signer.position,
//         signerMilitaryUnit: signer.militaryUnit,
//         signerRank: signer.rank,
//         signerFullName: signer.fullName,
//         signerDate: signer.date,
//         signerDateFormatted: formatSignerDate(signer.date),
//       },
//     };
//   }

//   if (payload.documentType === "order") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "order",
//       markers: {
//         nakazuiu: "НАКАЗУЮ:",
//         signerPosition: signer.position,
//         signerRank: signer.rank,
//         signerFirstName: signer.firstName,
//         signerLastName: signer.lastName,
//       },
//     };
//   }

//   return {
//     documentType: payload.documentType,
//     markers: {},
//   };
// };

// const buildAltDocxPath = (baseDocxPath, suffix = "bottom1077") => {
//   const parsed = path.parse(baseDocxPath);
//   return path.join(parsed.dir, `${parsed.name}.${suffix}${parsed.ext}`);
// };

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const resolveMarkerOk = (documentType, layout) => {
//   if (documentType === "report") {
//     return Boolean(layout?.layoutFlags?.proshuOk);
//   }

//   if (documentType === "order") {
//     return Boolean(layout?.layoutFlags?.nakazuiuOk);
//   }

//   return true;
// };

// const resolveSignatureOk = (documentType, layout) => {
//   if (documentType === "act") {
//     return true;
//   }

//   return Boolean(layout?.layoutFlags?.signatureOk);
// };

// const resolveSystemicWhitespace = (layout) =>
//   Boolean(layout?.systemicWhitespace?.triggered);

// const resolveWhitespaceScore = (layout) => {
//   const score = Number(layout?.systemicWhitespace?.score);
//   return Number.isFinite(score) ? score : Number.POSITIVE_INFINITY;
// };

// const tryBottomMarginFallback = async ({
//   payload,
//   profileName,
//   baseDocxPath,
//   pdfDir,
//   cleanupFileIfExists,
//   logger = console,
//   altBottomTwips = ALT_BOTTOM_TWIPS,
// }) => {
//   if (!payload?.documentType) {
//     throw new Error(
//       "tryBottomMarginFallback: payload.documentType is required",
//     );
//   }

//   if (!baseDocxPath) {
//     throw new Error("tryBottomMarginFallback: baseDocxPath is required");
//   }

//   if (!pdfDir) {
//     throw new Error("tryBottomMarginFallback: pdfDir is required");
//   }

//   if (typeof cleanupFileIfExists !== "function") {
//     throw new Error(
//       "tryBottomMarginFallback: cleanupFileIfExists must be a function",
//     );
//   }

//   const validationContext = buildValidationContext(payload);
//   const basePdfPath = buildPdfPath(baseDocxPath, pdfDir);

//   const baseLayout = await validateLayout(basePdfPath, validationContext);

//   const baseMarkerOk = resolveMarkerOk(payload.documentType, baseLayout);
//   const baseSignatureOk = resolveSignatureOk(payload.documentType, baseLayout);
//   const baseSystemicWhitespace = resolveSystemicWhitespace(baseLayout);
//   const baseWhitespaceScore = resolveWhitespaceScore(baseLayout);

//   logger.info?.(
//     `[tryBottomMarginFallback] base-evaluated profile=${profileName} markerOk=${baseMarkerOk} signatureOk=${baseSignatureOk} systemicWhitespace=${baseSystemicWhitespace} whitespaceScore=${baseWhitespaceScore}`,
//   );

//   // Случай C / D:
//   // если в base marker/signature уже не ок -> fallback не пробуем
//   if (!baseMarkerOk || !baseSignatureOk) {
//     return {
//       decision: "next-template",
//       reason: "base-critical-fail",
//       base: {
//         docxPath: baseDocxPath,
//         pdfPath: basePdfPath,
//         layout: baseLayout,
//         markerOk: baseMarkerOk,
//         signatureOk: baseSignatureOk,
//         systemicWhitespace: baseSystemicWhitespace,
//         whitespaceScore: baseWhitespaceScore,
//       },
//       alt: null,
//       artifacts: [],
//     };
//   }

//   // Случай A:
//   // если base уже ок и системного хвоста нет -> accept base
//   if (!baseSystemicWhitespace) {
//     return {
//       decision: "accept-base",
//       reason: "base-ok-no-systemic-tail",
//       base: {
//         docxPath: baseDocxPath,
//         pdfPath: basePdfPath,
//         layout: baseLayout,
//         markerOk: baseMarkerOk,
//         signatureOk: baseSignatureOk,
//         systemicWhitespace: baseSystemicWhitespace,
//         whitespaceScore: baseWhitespaceScore,
//       },
//       alt: null,
//       artifacts: [],
//     };
//   }

//   // Случай B:
//   // base marker/signature ok, но есть системный хвост -> пробуем alt
//   const altDocxPath = buildAltDocxPath(baseDocxPath, "bottom1077");
//   const altPdfPath = buildPdfPath(altDocxPath, pdfDir);

//   await cleanupFileIfExists(altDocxPath);
//   await cleanupFileIfExists(altPdfPath);

//   const baseBuffer = await fs.readFile(baseDocxPath);
//   const altBuffer = setSectionBottomMargin(baseBuffer, altBottomTwips);

//   await fs.writeFile(altDocxPath, altBuffer);
//   await convertToPdf(altDocxPath, pdfDir);

//   const altLayout = await validateLayout(altPdfPath, validationContext);

//   const altMarkerOk = resolveMarkerOk(payload.documentType, altLayout);
//   const altSignatureOk = resolveSignatureOk(payload.documentType, altLayout);
//   const altSystemicWhitespace = resolveSystemicWhitespace(altLayout);
//   const altWhitespaceScore = resolveWhitespaceScore(altLayout);

//   logger.info?.(
//     `[tryBottomMarginFallback] alt-evaluated profile=${profileName} markerOk=${altMarkerOk} signatureOk=${altSignatureOk} systemicWhitespace=${altSystemicWhitespace} whitespaceScore=${altWhitespaceScore}`,
//   );

//   const altImproved =
//     altMarkerOk &&
//     altSignatureOk &&
//     (!altSystemicWhitespace || altWhitespaceScore < baseWhitespaceScore);

//   if (altImproved) {
//     return {
//       decision: "accept-alt",
//       reason: "alt-fixed-or-improved-systemic-tail",
//       base: {
//         docxPath: baseDocxPath,
//         pdfPath: basePdfPath,
//         layout: baseLayout,
//         markerOk: baseMarkerOk,
//         signatureOk: baseSignatureOk,
//         systemicWhitespace: baseSystemicWhitespace,
//         whitespaceScore: baseWhitespaceScore,
//       },
//       alt: {
//         docxPath: altDocxPath,
//         pdfPath: altPdfPath,
//         layout: altLayout,
//         markerOk: altMarkerOk,
//         signatureOk: altSignatureOk,
//         systemicWhitespace: altSystemicWhitespace,
//         whitespaceScore: altWhitespaceScore,
//       },
//       artifacts: [altDocxPath, altPdfPath],
//     };
//   }

//   return {
//     decision: "next-template",
//     reason: "alt-failed-or-did-not-improve",
//     base: {
//       docxPath: baseDocxPath,
//       pdfPath: basePdfPath,
//       layout: baseLayout,
//       markerOk: baseMarkerOk,
//       signatureOk: baseSignatureOk,
//       systemicWhitespace: baseSystemicWhitespace,
//       whitespaceScore: baseWhitespaceScore,
//     },
//     alt: {
//       docxPath: altDocxPath,
//       pdfPath: altPdfPath,
//       layout: altLayout,
//       markerOk: altMarkerOk,
//       signatureOk: altSignatureOk,
//       systemicWhitespace: altSystemicWhitespace,
//       whitespaceScore: altWhitespaceScore,
//     },
//     artifacts: [altDocxPath, altPdfPath],
//   };
// };

// module.exports = {
//   tryBottomMarginFallback,
//   ALT_BOTTOM_TWIPS,
// };
const fs = require("fs/promises");
const path = require("path");

const { convertToPdf } = require("../pdf");
const validateLayout = require("./validateLayout");
const setSectionBottomMargin = require("../word/setSectionBottomMargin");
const setSectionTopAndBottomMargin = require("../word/setSectionTopAndBottomMargin");

const ALT_BOTTOM_TWIPS = 1077;
const ALT_TOP_TWIPS = 1077;

const formatSignerDate = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const buildValidationContext = (payload) => {
  if (payload.documentType === "report") {
    const signer = payload.data?.signer || {};

    return {
      documentType: "report",
      markers: {
        proshu: "ПРОШУ:",
        foundationPhrase: "На підставі вищезазначеного,",
        signerPosition: signer.position,
        signerMilitaryUnit: signer.militaryUnit,
        signerRank: signer.rank,
        signerFullName: signer.fullName,
        signerDate: signer.date,
        signerDateFormatted: formatSignerDate(signer.date),
      },
    };
  }

  if (payload.documentType === "order") {
    const signer = payload.data?.signer || {};

    return {
      documentType: "order",
      markers: {
        nakazuiu: "НАКАЗУЮ:",
        signerPosition: signer.position,
        signerRank: signer.rank,
        signerFirstName: signer.firstName,
        signerLastName: signer.lastName,
      },
    };
  }

  return {
    documentType: payload.documentType,
    markers: {},
  };
};

const buildAltDocxPath = (baseDocxPath, suffix = "bottom1077") => {
  const parsed = path.parse(baseDocxPath);
  return path.join(parsed.dir, `${parsed.name}.${suffix}${parsed.ext}`);
};

const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const resolveMarkerOk = (documentType, layout) => {
  if (documentType === "report") {
    return Boolean(layout?.layoutFlags?.proshuOk);
  }

  if (documentType === "order") {
    return Boolean(layout?.layoutFlags?.nakazuiuOk);
  }

  return true;
};

const resolveSignatureOk = (documentType, layout) => {
  if (documentType === "act") {
    return true;
  }

  return Boolean(layout?.layoutFlags?.signatureOk);
};

const resolveSystemicWhitespace = (layout) =>
  Boolean(layout?.systemicWhitespace?.triggered);

const resolveWhitespaceScore = (layout) => {
  const score = Number(layout?.systemicWhitespace?.score);
  return Number.isFinite(score) ? score : Number.POSITIVE_INFINITY;
};

const buildVariantResult = ({
  docxPath,
  pdfPath,
  layout,
  markerOk,
  signatureOk,
  systemicWhitespace,
  whitespaceScore,
}) => ({
  docxPath,
  pdfPath,
  layout,
  markerOk,
  signatureOk,
  systemicWhitespace,
  whitespaceScore,
});

const evaluateAltVariant = async ({
  sourceDocxPath,
  altDocxPath,
  pdfDir,
  validationContext,
  payload,
  cleanupFileIfExists,
  transformBuffer,
}) => {
  const altPdfPath = buildPdfPath(altDocxPath, pdfDir);

  await cleanupFileIfExists(altDocxPath);
  await cleanupFileIfExists(altPdfPath);

  const baseBuffer = await fs.readFile(sourceDocxPath);
  const altBuffer = transformBuffer(baseBuffer);

  await fs.writeFile(altDocxPath, altBuffer);
  await convertToPdf(altDocxPath, pdfDir);

  const altLayout = await validateLayout(altPdfPath, validationContext);

  const altMarkerOk = resolveMarkerOk(payload.documentType, altLayout);
  const altSignatureOk = resolveSignatureOk(payload.documentType, altLayout);
  const altSystemicWhitespace = resolveSystemicWhitespace(altLayout);
  const altWhitespaceScore = resolveWhitespaceScore(altLayout);

  return buildVariantResult({
    docxPath: altDocxPath,
    pdfPath: altPdfPath,
    layout: altLayout,
    markerOk: altMarkerOk,
    signatureOk: altSignatureOk,
    systemicWhitespace: altSystemicWhitespace,
    whitespaceScore: altWhitespaceScore,
  });
};

const isAltImproved = (base, alt) =>
  alt.markerOk &&
  alt.signatureOk &&
  (!alt.systemicWhitespace || alt.whitespaceScore < base.whitespaceScore);

const tryBottomMarginFallback = async ({
  payload,
  profileName,
  baseDocxPath,
  pdfDir,
  cleanupFileIfExists,
  logger = console,
  altBottomTwips = ALT_BOTTOM_TWIPS,
  altTopTwips = ALT_TOP_TWIPS,
}) => {
  if (!payload?.documentType) {
    throw new Error(
      "tryBottomMarginFallback: payload.documentType is required",
    );
  }

  if (!baseDocxPath) {
    throw new Error("tryBottomMarginFallback: baseDocxPath is required");
  }

  if (!pdfDir) {
    throw new Error("tryBottomMarginFallback: pdfDir is required");
  }

  if (typeof cleanupFileIfExists !== "function") {
    throw new Error(
      "tryBottomMarginFallback: cleanupFileIfExists must be a function",
    );
  }

  const validationContext = buildValidationContext(payload);
  const basePdfPath = buildPdfPath(baseDocxPath, pdfDir);

  const baseLayout = await validateLayout(basePdfPath, validationContext);

  const base = buildVariantResult({
    docxPath: baseDocxPath,
    pdfPath: basePdfPath,
    layout: baseLayout,
    markerOk: resolveMarkerOk(payload.documentType, baseLayout),
    signatureOk: resolveSignatureOk(payload.documentType, baseLayout),
    systemicWhitespace: resolveSystemicWhitespace(baseLayout),
    whitespaceScore: resolveWhitespaceScore(baseLayout),
  });

  logger.info?.(
    `[tryBottomMarginFallback] base-evaluated profile=${profileName} markerOk=${base.markerOk} signatureOk=${base.signatureOk} systemicWhitespace=${base.systemicWhitespace} whitespaceScore=${base.whitespaceScore}`,
  );

  if (!base.markerOk || !base.signatureOk) {
    return {
      decision: "next-template",
      reason: "base-critical-fail",
      base,
      alt: null,
      artifacts: [],
    };
  }

  if (!base.systemicWhitespace) {
    return {
      decision: "accept-base",
      reason: "base-ok-no-systemic-tail",
      base,
      alt: null,
      artifacts: [],
    };
  }

  const artifacts = [];

  const altBottomDocxPath = buildAltDocxPath(baseDocxPath, "bottom1077");

  const altBottom = await evaluateAltVariant({
    sourceDocxPath: baseDocxPath,
    altDocxPath: altBottomDocxPath,
    pdfDir,
    validationContext,
    payload,
    cleanupFileIfExists,
    transformBuffer: (buffer) => setSectionBottomMargin(buffer, altBottomTwips),
  });

  artifacts.push(altBottom.docxPath, altBottom.pdfPath);

  logger.info?.(
    `[tryBottomMarginFallback] alt-bottom-evaluated profile=${profileName} markerOk=${altBottom.markerOk} signatureOk=${altBottom.signatureOk} systemicWhitespace=${altBottom.systemicWhitespace} whitespaceScore=${altBottom.whitespaceScore}`,
  );

  if (isAltImproved(base, altBottom)) {
    return {
      decision: "accept-alt",
      reason: "alt-bottom-fixed-or-improved-systemic-tail",
      base,
      alt: altBottom,
      artifacts,
    };
  }

  const altTopBottomDocxPath = buildAltDocxPath(
    baseDocxPath,
    "top1077_bottom1077",
  );

  const altTopBottom = await evaluateAltVariant({
    sourceDocxPath: baseDocxPath,
    altDocxPath: altTopBottomDocxPath,
    pdfDir,
    validationContext,
    payload,
    cleanupFileIfExists,
    transformBuffer: (buffer) =>
      setSectionTopAndBottomMargin(buffer, altTopTwips, altBottomTwips),
  });

  artifacts.push(altTopBottom.docxPath, altTopBottom.pdfPath);

  logger.info?.(
    `[tryBottomMarginFallback] alt-top-bottom-evaluated profile=${profileName} markerOk=${altTopBottom.markerOk} signatureOk=${altTopBottom.signatureOk} systemicWhitespace=${altTopBottom.systemicWhitespace} whitespaceScore=${altTopBottom.whitespaceScore}`,
  );

  if (isAltImproved(base, altTopBottom)) {
    return {
      decision: "accept-alt",
      reason: "alt-top-bottom-fixed-or-improved-systemic-tail",
      base,
      alt: altTopBottom,
      artifacts,
    };
  }

  return {
    decision: "next-template",
    reason: "all-alt-variants-failed-or-did-not-improve",
    base,
    alt: altTopBottom,
    artifacts,
  };
};

module.exports = {
  tryBottomMarginFallback,
  ALT_BOTTOM_TWIPS,
  ALT_TOP_TWIPS,
};
