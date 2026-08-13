const extractPdfPagesText = require("./extractPdfPagesText");

const normalizeText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim().toLowerCase();

const includesNormalized = (haystack, needle) => {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!n) return false;
  return h.includes(n);
};

const safeParts = (...values) =>
  values.map((value) => String(value || "").trim()).filter(Boolean);

const detectDetachedSignature = async (pdfPath, payload) => {
  const signer = payload?.data?.signer || {};
  const pages = await extractPdfPagesText(pdfPath);

  if (pages.length < 2) {
    return {
      detached: false,
      reason: "single_page_document",
      pages,
      debug: {},
    };
  }

  const lastPage = pages[pages.length - 1];
  const prevPage = pages[pages.length - 2];

  const signerPosition = safeParts(signer.position).join(" ");
  const signerRank = safeParts(signer.rank).join(" ");
  const signerName = safeParts(signer.firstName, signer.lastName).join(" ");
  const signerLastName = safeParts(signer.lastName).join(" ");

  const lastPageText = lastPage.text || "";
  const prevPageText = prevPage.text || "";

  const lastPageHasPosition = signerPosition
    ? includesNormalized(lastPageText, signerPosition)
    : false;

  const lastPageHasRank = signerRank
    ? includesNormalized(lastPageText, signerRank)
    : false;

  const lastPageHasName = signerName
    ? includesNormalized(lastPageText, signerName)
    : false;

  const lastPageHasLastName = signerLastName
    ? includesNormalized(lastPageText, signerLastName)
    : false;

  const signatureMarkerCount = [
    lastPageHasPosition,
    lastPageHasRank,
    lastPageHasName || lastPageHasLastName,
  ].filter(Boolean).length;

  const lastPageTextLength = normalizeText(lastPageText).length;
  const prevPageTextLength = normalizeText(prevPageText).length;

  const lastPageLooksSparse =
    lastPageTextLength > 0 && lastPageTextLength <= 220;
  const prevPageLooksContentHeavy = prevPageTextLength >= 500;

  const lastPageContainsMainBodySignals =
    includesNormalized(lastPageText, "НАКАЗУЮ:") ||
    /\b\d+\.\b/.test(lastPageText) ||
    includesNormalized(lastPageText, "Особовий склад") ||
    includesNormalized(lastPageText, "військової частини");

  const prevPageContainsMainBodySignals =
    /\b\d+\.\b/.test(prevPageText) ||
    includesNormalized(prevPageText, "Особовий склад") ||
    includesNormalized(prevPageText, "військової частини");

  const detached =
    signatureMarkerCount >= 2 &&
    lastPageLooksSparse &&
    prevPageLooksContentHeavy &&
    !lastPageContainsMainBodySignals &&
    prevPageContainsMainBodySignals;

  let reason = "no_detached_signature";

  if (detached) {
    reason = "signature_only_last_page";
  }

  return {
    detached,
    reason,
    pages,
    debug: {
      pageCount: pages.length,
      signatureMarkerCount,
      lastPageTextLength,
      prevPageTextLength,
      lastPageHasPosition,
      lastPageHasRank,
      lastPageHasName,
      lastPageHasLastName,
      lastPageLooksSparse,
      prevPageLooksContentHeavy,
      lastPageContainsMainBodySignals,
      prevPageContainsMainBodySignals,
      lastPagePreview: lastPageText.slice(0, 300),
      prevPagePreview: prevPageText.slice(0, 300),
    },
  };
};

module.exports = detectDetachedSignature;
