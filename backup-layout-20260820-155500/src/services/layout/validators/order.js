// const { normalizeText, pushViolation } = require("./common");

// const findMarkerOccurrences = (pages, marker) => {
//   const normalizedMarker = normalizeText(marker);
//   const matches = [];

//   if (!normalizedMarker) return matches;

//   for (const page of pages) {
//     for (let i = 0; i < page.lines.length; i++) {
//       const lineText = normalizeText(page.lines[i].text);
//       if (lineText.includes(normalizedMarker)) {
//         matches.push({
//           pageNumber: page.pageNumber,
//           lineIndex: i,
//           lineText,
//         });
//       }
//     }
//   }

//   return matches;
// };

// const collectSignatureAnchors = (markers = {}) => {
//   return [
//     { key: "signerPosition", value: markers.signerPosition },
//     { key: "signerMilitaryUnit", value: markers.signerMilitaryUnit },
//     { key: "signerRank", value: markers.signerRank },
//     { key: "signerFullName", value: markers.signerFullName },
//     {
//       key: "signerDate",
//       value: markers.signerDateFormatted || markers.signerDate,
//     },
//   ]
//     .map((item) => ({
//       ...item,
//       normalized: normalizeText(item.value),
//     }))
//     .filter((item) => item.normalized);
// };

// const locateSignatureBlock = (pages, markers = {}) => {
//   const anchors = collectSignatureAnchors(markers);
//   const found = [];

//   for (const page of pages) {
//     for (let i = 0; i < page.lines.length; i++) {
//       const lineText = normalizeText(page.lines[i].text);

//       for (const anchor of anchors) {
//         if (lineText.includes(anchor.normalized)) {
//           found.push({
//             pageNumber: page.pageNumber,
//             lineIndex: i,
//             anchor: anchor.key,
//             text: lineText,
//           });
//         }
//       }
//     }
//   }

//   return found;
// };

// const validateNakazuiuRules = (pages, markers, violations) => {
//   const nakazuiuMarker = normalizeText(markers.nakazuiu || "НАКАЗУЮ:");
//   if (!nakazuiuMarker) return;

//   const occurrences = findMarkerOccurrences(pages, nakazuiuMarker);

//   for (const occurrence of occurrences) {
//     const page = pages.find(
//       (item) => item.pageNumber === occurrence.pageNumber,
//     );
//     if (!page) continue;

//     const linesAfter = page.lines
//       .slice(occurrence.lineIndex + 1)
//       .filter((line) => normalizeText(line.text));

//     if (linesAfter.length < 2) {
//       pushViolation(
//         violations,
//         "NAKAZUIU_NOT_ENOUGH_LINES_AFTER",
//         "Після 'НАКАЗУЮ:' немає мінімум 2 рядків тексту першого пункту на цій сторінці",
//         page.pageNumber,
//         { linesAfterCount: linesAfter.length },
//       );
//     }
//   }
// };

// const validateOrderSignatureRules = (pages, markers, violations) => {
//   const signatureHits = locateSignatureBlock(pages, markers);

//   if (!signatureHits.length) {
//     return;
//   }

//   const sortedHits = signatureHits.slice().sort((a, b) => {
//     if (a.pageNumber !== b.pageNumber) {
//       return a.pageNumber - b.pageNumber;
//     }
//     return a.lineIndex - b.lineIndex;
//   });

//   const pagesWithSignature = [
//     ...new Set(sortedHits.map((hit) => hit.pageNumber)),
//   ];

//   if (pagesWithSignature.length > 1) {
//     pushViolation(
//       violations,
//       "ORDER_SIGNATURE_BLOCK_SPLIT",
//       "Блок підпису наказу розірваний між сторінками",
//       pagesWithSignature[0],
//       { pages: pagesWithSignature },
//     );
//   }

//   const firstSignatureHit = sortedHits[0];
//   const signaturePage = pages.find(
//     (item) => item.pageNumber === firstSignatureHit.pageNumber,
//   );

//   if (!signaturePage) {
//     return;
//   }

//   const textLinesBeforeSignature = signaturePage.lines
//     .slice(0, firstSignatureHit.lineIndex)
//     .filter((line) => normalizeText(line.text));

//   const linesBeforeCount = textLinesBeforeSignature.length;
//   const lastTwoBefore = textLinesBeforeSignature.slice(-2);

//   if (lastTwoBefore.length < 2) {
//     pushViolation(
//       violations,
//       "ORDER_SIGNATURE_WITHOUT_CONTEXT",
//       "На сторінці з підписом перед підписом менше 2 рядків тексту",
//       signaturePage.pageNumber,
//       { linesBeforeCount },
//     );
//   }

//   if (signaturePage.isLastPage && lastTwoBefore.length < 2) {
//     pushViolation(
//       violations,
//       "ORDER_SIGNATURE_ORPHAN_LAST_PAGE",
//       "Підпис перенесений на останню сторінку без мінімум 2 рядків тексту перед ним",
//       signaturePage.pageNumber,
//       { linesBeforeCount },
//     );
//   }
// };

// const validateOrderLayoutRules = (pages, context = {}, violations) => {
//   const markers = context.markers || {};

//   validateNakazuiuRules(pages, markers, violations);
//   validateOrderSignatureRules(pages, markers, violations);
// };

// module.exports = validateOrderLayoutRules;
const { normalizeText, pushViolation } = require("./common");

const findMarkerOccurrences = (pages, marker) => {
  const normalizedMarker = normalizeText(marker);
  const matches = [];

  if (!normalizedMarker) return matches;

  for (const page of pages) {
    for (let i = 0; i < page.lines.length; i++) {
      const lineText = normalizeText(page.lines[i].text);
      if (lineText.includes(normalizedMarker)) {
        matches.push({
          pageNumber: page.pageNumber,
          lineIndex: i,
          lineText,
        });
      }
    }
  }

  return matches;
};

const collectSignatureAnchors = (markers = {}) => {
  return [
    { key: "signerPosition", value: markers.signerPosition },
    { key: "signerRank", value: markers.signerRank },
    { key: "signerFirstName", value: markers.signerFirstName },
    { key: "signerLastName", value: markers.signerLastName },
  ]
    .map((item) => ({
      ...item,
      normalized: normalizeText(item.value),
    }))
    .filter((item) => item.normalized);
};

const locateSignatureHits = (pages, markers = {}) => {
  const anchors = collectSignatureAnchors(markers);
  const hits = [];

  if (!anchors.length) return hits;

  for (const page of pages) {
    for (let i = 0; i < page.lines.length; i++) {
      const lineText = normalizeText(page.lines[i].text);

      for (const anchor of anchors) {
        if (lineText.includes(anchor.normalized)) {
          hits.push({
            pageNumber: page.pageNumber,
            lineIndex: i,
            anchor: anchor.key,
            text: lineText,
          });
        }
      }
    }
  }

  return hits;
};

const validateNakazuiuRules = (pages, markers, violations) => {
  const nakazuiuMarker = normalizeText(markers.nakazuiu || "НАКАЗУЮ:");
  if (!nakazuiuMarker) return;

  const occurrences = findMarkerOccurrences(pages, nakazuiuMarker);

  for (const occurrence of occurrences) {
    const page = pages.find(
      (item) => item.pageNumber === occurrence.pageNumber,
    );
    if (!page) continue;

    const nonEmptyLinesAfter = page.lines
      .slice(occurrence.lineIndex + 1)
      .filter((line) => normalizeText(line.text));

    if (!nonEmptyLinesAfter.length) {
      pushViolation(
        violations,
        "NAKAZUIU_LAST_LINE",
        "Слово 'НАКАЗУЮ:' залишено останнім рядком сторінки",
        page.pageNumber,
      );
    }

    if (nonEmptyLinesAfter.length < 2) {
      pushViolation(
        violations,
        "NAKAZUIU_NOT_ENOUGH_LINES_AFTER",
        "Після 'НАКАЗУЮ:' немає мінімум 2 рядків тексту першого пункту на цій сторінці",
        page.pageNumber,
        { linesAfterCount: nonEmptyLinesAfter.length },
      );
    }
  }
};

const validateSignatureRules = (pages, markers, violations) => {
  const signatureHits = locateSignatureHits(pages, markers);

  if (!signatureHits.length) {
    return;
  }

  const sortedHits = signatureHits.slice().sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    return a.lineIndex - b.lineIndex;
  });

  const pagesWithSignature = [
    ...new Set(sortedHits.map((hit) => hit.pageNumber)),
  ];

  if (pagesWithSignature.length > 1) {
    pushViolation(
      violations,
      "ORDER_SIGNATURE_BLOCK_SPLIT",
      "Блок підпису наказу розірваний між сторінками",
      pagesWithSignature[0],
      { pages: pagesWithSignature },
    );
  }

  const firstHit = sortedHits[0];
  const signaturePage = pages.find(
    (page) => page.pageNumber === firstHit.pageNumber,
  );

  if (!signaturePage) {
    return;
  }

  const nonEmptyLinesBefore = signaturePage.lines
    .slice(0, firstHit.lineIndex)
    .filter((line) => normalizeText(line.text));

  const trailingContextLines = nonEmptyLinesBefore.slice(-2);
  const linesBeforeCount = trailingContextLines.length;

  if (linesBeforeCount < 2) {
    pushViolation(
      violations,
      "ORDER_SIGNATURE_WITHOUT_CONTEXT",
      "На сторінці з підписом перед підписом менше 2 рядків тексту",
      signaturePage.pageNumber,
      { linesBeforeCount },
    );
  }

  if (signaturePage.isLastPage && linesBeforeCount < 2) {
    pushViolation(
      violations,
      "ORDER_SIGNATURE_ORPHAN_LAST_PAGE",
      "Підпис перенесений на останню сторінку без мінімум 2 рядків тексту перед ним",
      signaturePage.pageNumber,
      { linesBeforeCount },
    );
  }
};

const validateOrderLayoutRules = (pages, context = {}, violations) => {
  const markers = context.markers || {};

  validateNakazuiuRules(pages, markers, violations);
  validateSignatureRules(pages, markers, violations);
};

module.exports = validateOrderLayoutRules;
