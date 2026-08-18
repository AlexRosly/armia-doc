const fs = require("fs/promises");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const LOG_PREFIX = "[detectOrderTailGap]";

const normalizeText = (value) =>
  String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildLooseMarkerRegex = (markerText) => {
  const normalized = normalizeText(markerText);
  const parts = normalized.split(" ").filter(Boolean).map(escapeRegExp);

  if (!parts.length) {
    return null;
  }

  return new RegExp(parts.join("\\s*"), "iu");
};

const buildSafeResult = (overrides = {}) => ({
  ok: false,
  markerFound: false,
  markerPage: null,
  hasLargeTailGap: false,
  tailGapPt: null,
  minGapPt: null,
  reason: "tail_gap_detection_failed",
  debug: {},
  ...overrides,
});

const getPdfDocument = async (pdfPath) => {
  const buffer = await fs.readFile(pdfPath);
  const data = new Uint8Array(buffer);

  return pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
};

const extractPageItems = async (page) => {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });

  const items = (textContent.items || []).map((item, index) => {
    const str = normalizeText(item.str || "");
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = Number(transform[4] || 0);
    const y = Number(transform[5] || 0);
    const width = Number(item.width || 0);
    const height = Number(item.height || 0);

    return {
      index,
      str,
      raw: item.str || "",
      x,
      y,
      width,
      height,
    };
  });

  return {
    width: viewport.width,
    height: viewport.height,
    items,
  };
};

const findMarkerItemIndex = (items, markerText) => {
  const markerRegex = buildLooseMarkerRegex(markerText);

  if (!markerRegex) {
    return -1;
  }

  for (let i = 0; i < items.length; i++) {
    const value = normalizeText(items[i].raw || items[i].str || "");
    if (value && markerRegex.test(value)) {
      return i;
    }
  }

  const joined = items
    .map((item) => normalizeText(item.raw || item.str || ""))
    .join(" ");

  if (!markerRegex.test(joined)) {
    return -1;
  }

  let acc = "";
  for (let i = 0; i < items.length; i++) {
    acc = `${acc} ${normalizeText(items[i].raw || items[i].str || "")}`.trim();
    if (markerRegex.test(acc)) {
      return i;
    }
  }

  return -1;
};

const safeDestroyPdf = async (pdf) => {
  if (!pdf || typeof pdf.destroy !== "function") {
    return;
  }

  try {
    await pdf.destroy();
  } catch (error) {
    console.warn(`${LOG_PREFIX} pdf.destroy failed`);
    console.warn(error?.message || error);
  }
};

const detectOrderTailGap = async (pdfPath, options = {}) => {
  const {
    markerText = "НАКАЗУЮ:",
    minGapPt = 90,
    bottomMarginCm = 2.0,
    debug = false,
  } = options;

  let pdf = null;

  try {
    if (!pdfPath || typeof pdfPath !== "string") {
      return buildSafeResult({
        minGapPt,
        reason: "invalid_pdf_path",
        debug: {
          pdfPath,
        },
      });
    }

    pdf = await getPdfDocument(pdfPath);

    const printableBottomPaddingPt = (Number(bottomMarginCm) / 2.54) * 72;
    const totalPages = Number(pdf?.numPages || 0);

    if (!totalPages) {
      return buildSafeResult({
        ok: true,
        minGapPt,
        reason: "pdf_has_no_pages",
        debug: {
          pdfPath,
          totalPages,
        },
      });
    }

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      let page = null;
      let pageData = null;

      try {
        page = await pdf.getPage(pageNumber);
        pageData = await extractPageItems(page);
      } catch (error) {
        console.warn(
          `${LOG_PREFIX} failed to read page=${pageNumber} pdfPath=${pdfPath}`,
        );
        console.warn(error?.message || error);
        continue;
      }

      const { height: pageHeight, items } = pageData || {
        height: null,
        items: [],
      };

      if (!Array.isArray(items) || !items.length) {
        continue;
      }

      const markerIndex = findMarkerItemIndex(items, markerText);

      if (markerIndex === -1) {
        continue;
      }

      const itemsBeforeMarker = items
        .slice(0, markerIndex)
        .filter((item) => item && item.str);

      if (!itemsBeforeMarker.length) {
        const result = {
          ok: true,
          markerFound: true,
          markerPage: pageNumber,
          hasLargeTailGap: false,
          tailGapPt: 0,
          minGapPt,
          reason: "marker_is_first_content_on_page",
          debug: {
            pdfPath,
            pageHeight,
            printableBottomPaddingPt,
            markerIndex,
            itemsBeforeMarkerCount: 0,
          },
        };

        if (debug) {
          console.log(
            `${LOG_PREFIX} marker found as first content page=${pageNumber}`,
          );
        }

        return result;
      }

      const yValues = itemsBeforeMarker
        .map((item) => Number(item.y))
        .filter((value) => Number.isFinite(value));

      if (!yValues.length) {
        return buildSafeResult({
          ok: true,
          markerFound: true,
          markerPage: pageNumber,
          hasLargeTailGap: false,
          tailGapPt: null,
          minGapPt,
          reason: "no_valid_y_values_before_marker",
          debug: {
            pdfPath,
            pageHeight,
            printableBottomPaddingPt,
            markerIndex,
            itemsBeforeMarkerCount: itemsBeforeMarker.length,
          },
        });
      }

      const lowestTextY = Math.min(...yValues);
      const tailGapPt = Math.max(0, lowestTextY - printableBottomPaddingPt);
      const hasLargeTailGap = tailGapPt >= minGapPt;

      const result = {
        ok: true,
        markerFound: true,
        markerPage: pageNumber,
        hasLargeTailGap,
        tailGapPt,
        minGapPt,
        reason: hasLargeTailGap
          ? "tail_gap_above_threshold"
          : "tail_gap_within_threshold",
        debug: {
          pdfPath,
          pageHeight,
          printableBottomPaddingPt,
          lowestTextY,
          markerIndex,
          itemsBeforeMarkerCount: itemsBeforeMarker.length,
        },
      };

      if (debug) {
        console.log(
          `${LOG_PREFIX} markerPage=${pageNumber} tailGapPt=${tailGapPt.toFixed(2)} minGapPt=${minGapPt} hasLargeTailGap=${hasLargeTailGap}`,
        );
      }

      return result;
    }

    return {
      ok: true,
      markerFound: false,
      markerPage: null,
      hasLargeTailGap: false,
      tailGapPt: null,
      minGapPt,
      reason: "marker_not_found",
      debug: {
        pdfPath,
        totalPages,
      },
    };
  } catch (error) {
    console.warn(`${LOG_PREFIX} failed pdfPath=${pdfPath}`);
    console.warn(error?.message || error);

    return buildSafeResult({
      minGapPt,
      reason: "tail_gap_detection_failed",
      debug: {
        pdfPath,
        errorMessage: error?.message || String(error),
      },
    });
  } finally {
    await safeDestroyPdf(pdf);
  }
};

module.exports = detectOrderTailGap;
