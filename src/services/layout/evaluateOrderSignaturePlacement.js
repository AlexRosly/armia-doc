// const extractPdfPageTextItems = require("./extractPdfPageTextItems");

// const normalizeText = (value = "") =>
//   String(value).replace(/\s+/g, " ").trim().toLowerCase();

// const includesNormalized = (haystack, needle) => {
//   const h = normalizeText(haystack);
//   const n = normalizeText(needle);
//   if (!n) return false;
//   return h.includes(n);
// };

// const hasCyrillicLetters = (value = "") => /[А-Яа-яІіЇїЄєҐґ]/.test(value);

// const compact = (values) =>
//   values.map((v) => String(v || "").trim()).filter(Boolean);

// const isSignatureItemMatch = (itemText, signer) => {
//   const text = normalizeText(itemText);
//   if (!text) return { matched: false, kind: null };

//   const fullName = compact([signer.firstName, signer.lastName]).join(" ");
//   const lastName = String(signer.lastName || "").trim();
//   const position = String(signer.position || "").trim();
//   const rank = String(signer.rank || "").trim();

//   if (position && includesNormalized(text, position)) {
//     return { matched: true, kind: "position" };
//   }

//   if (rank && includesNormalized(text, rank)) {
//     return { matched: true, kind: "rank" };
//   }

//   if (fullName && includesNormalized(text, fullName)) {
//     return { matched: true, kind: "fullName" };
//   }

//   if (lastName && includesNormalized(text, lastName)) {
//     return { matched: true, kind: "lastName" };
//   }

//   return { matched: false, kind: null };
// };

// const groupMatchedItems = (items) => {
//   if (!items.length) return [];

//   const sorted = [...items].sort((a, b) => b.y - a.y);
//   const groups = [];
//   const tolerance = 18;

//   for (const item of sorted) {
//     const existingGroup = groups.find(
//       (group) => Math.abs(group.anchorY - item.y) <= tolerance,
//     );

//     if (existingGroup) {
//       existingGroup.items.push(item);
//       existingGroup.anchorY = Math.max(existingGroup.anchorY, item.y);
//     } else {
//       groups.push({
//         anchorY: item.y,
//         items: [item],
//       });
//     }
//   }

//   return groups;
// };

// const evaluateOrderSignaturePlacement = async (
//   pdfPath,
//   payload,
//   options = {},
// ) => {
//   const signer = payload?.data?.signer || {};
//   const { maxTopRatio = 0.45, minMatchedKinds = 2 } = options;

//   const pages = await extractPdfPageTextItems(pdfPath);

//   if (!pages.length) {
//     return {
//       ok: false,
//       reason: "no_pages",
//       debug: {},
//     };
//   }

//   const lastPage = pages[pages.length - 1];

//   const matchedItems = [];
//   const matchedKinds = new Set();

//   for (const item of lastPage.items) {
//     const result = isSignatureItemMatch(item.text, signer);
//     if (!result.matched) continue;

//     matchedItems.push({
//       ...item,
//       kind: result.kind,
//     });
//     matchedKinds.add(result.kind);
//   }

//   if (matchedKinds.size < minMatchedKinds) {
//     return {
//       ok: false,
//       reason: "signature_not_found_reliably",
//       debug: {
//         pageNumber: lastPage.pageNumber,
//         pageHeight: lastPage.height,
//         matchedKinds: [...matchedKinds],
//         matchedItemsPreview: matchedItems.slice(0, 10),
//         lastPageTextPreview: (lastPage.text || "").slice(0, 400),
//       },
//     };
//   }

//   const groups = groupMatchedItems(matchedItems);

//   const bestGroup = groups.sort(
//     (a, b) => b.items.length - a.items.length || b.anchorY - a.anchorY,
//   )[0];

//   const signatureItems = bestGroup?.items || matchedItems;

//   const ys = signatureItems.map((item) => item.y);
//   const topY = Math.max(...ys);
//   const bottomY = Math.min(...ys);

//   const pageHeight = Number(lastPage.height || 1);
//   const topRatioFromBottom = topY / pageHeight;

//   const textBeforeSignature = lastPage.items
//     .filter((item) => item.y > topY)
//     .map((item) => item.text)
//     .join(" ");

//   const textBeforeSignatureLength = normalizeText(textBeforeSignature).length;

//   const hasBodyBeforeSignature = textBeforeSignatureLength >= 250;

//   const signatureTooHigh =
//     topRatioFromBottom > maxTopRatio && !hasBodyBeforeSignature;

//   return {
//     ok: !signatureTooHigh,
//     reason: signatureTooHigh ? "signature_too_high_on_last_page" : "ok",
//     debug: {
//       pageNumber: lastPage.pageNumber,
//       pageHeight,
//       matchedKinds: [...matchedKinds],
//       matchedItemsCount: matchedItems.length,
//       signatureTopY: topY,
//       signatureBottomY: bottomY,
//       signatureTopRatioFromBottom: topRatioFromBottom,
//       maxTopRatio,
//       textBeforeSignatureLength,
//       hasBodyBeforeSignature,
//       signatureItems: signatureItems.map((item) => ({
//         text: item.text,
//         kind: item.kind,
//         x: item.x,
//         y: item.y,
//       })),
//       lastPagePreview: (lastPage.text || "").slice(0, 500),
//     },
//   };
// };

// module.exports = evaluateOrderSignaturePlacement;
const extractPdfPageTextItems = require("./extractPdfPageTextItems");

const normalizeText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim().toLowerCase();

const includesNormalized = (haystack, needle) => {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!n) return false;
  return h.includes(n);
};

const countBodySignals = (text = "") => {
  const normalized = normalizeText(text);

  let score = 0;

  if (/\b\d+\.\b/.test(normalized)) score += 2;
  if (includesNormalized(normalized, "наказ")) score += 1;
  if (includesNormalized(normalized, "покласти")) score += 1;
  if (includesNormalized(normalized, "особового складу")) score += 1;
  if (includesNormalized(normalized, "військової частини")) score += 1;

  return score;
};

const evaluateOrderSignaturePlacement = async (
  pdfPath,
  payload,
  options = {},
) => {
  const {
    markerText = "__SIGNATURE_START__",
    minTextBeforeMarkerLength = 120,
    minBodySignalScore = 1,
  } = options;

  const pages = await extractPdfPageTextItems(pdfPath);

  if (!pages.length) {
    return {
      ok: false,
      reason: "no_pages",
      debug: {},
    };
  }

  const lastPage = pages[pages.length - 1];
  const normalizedMarker = normalizeText(markerText);

  const markerItems = lastPage.items.filter((item) =>
    includesNormalized(item.text, normalizedMarker),
  );

  if (!markerItems.length) {
    return {
      ok: false,
      reason: "signature_marker_not_found_on_last_page",
      debug: {
        pageNumber: lastPage.pageNumber,
        markerText,
        lastPagePreview: (lastPage.text || "").slice(0, 500),
      },
    };
  }

  const markerTopY = Math.max(...markerItems.map((item) => item.y));

  const textBeforeMarker = lastPage.items
    .filter((item) => item.y > markerTopY)
    .map((item) => item.text)
    .join(" ");

  const textBeforeMarkerLength = normalizeText(textBeforeMarker).length;
  const bodySignalScore = countBodySignals(textBeforeMarker);

  const ok =
    textBeforeMarkerLength >= minTextBeforeMarkerLength &&
    bodySignalScore >= minBodySignalScore;

  return {
    ok,
    reason: ok ? "ok" : "too_little_body_text_before_signature_marker",
    debug: {
      pageNumber: lastPage.pageNumber,
      pageHeight: lastPage.height,
      markerText,
      markerItemsCount: markerItems.length,
      markerTopY,
      textBeforeMarkerLength,
      minTextBeforeMarkerLength,
      bodySignalScore,
      minBodySignalScore,
      textBeforeMarkerPreview: textBeforeMarker.slice(0, 500),
      lastPagePreview: (lastPage.text || "").slice(0, 800),
    },
  };
};

module.exports = evaluateOrderSignaturePlacement;
