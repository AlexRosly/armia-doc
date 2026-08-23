const fs = require("fs/promises");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const extractPdfPageTextItems = require("./extractPdfPageTextItems");

const APPROVAL_MARKERS = ["ПОГОДЖЕНО", "ПРОЕКТ НАКАЗУ ПІДГОТУВАВ"];

const normalizeText = (value = "") =>
  String(value).toLocaleUpperCase("uk-UA").replace(/\s+/g, " ").trim();

const pageContainsApprovalMarker = (page) => {
  const text = normalizeText(page?.text);
  return APPROVAL_MARKERS.some((marker) =>
    text.includes(normalizeText(marker)),
  );
};

const buildPageIndexes = (startIndex, endIndex) =>
  Array.from(
    { length: Math.max(0, endIndex - startIndex) },
    (_, offset) => startIndex + offset,
  );

const writePdfRange = async ({ sourcePdf, indexes, outputPath }) => {
  const outputPdf = await PDFDocument.create();
  const pages = await outputPdf.copyPages(sourcePdf, indexes);
  for (const page of pages) outputPdf.addPage(page);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, await outputPdf.save());
};

const splitFinalOrderCandidatePdf = async ({
  mergedPdfPath,
  orderPdfPath,
  approvalPdfPath,
  expectedApprovalPageCount = 1,
}) => {
  const expectedApproval = Number(expectedApprovalPageCount);
  if (!Number.isInteger(expectedApproval) || expectedApproval < 1) {
    throw new Error(
      `Invalid expected approval page count: ${expectedApprovalPageCount}`,
    );
  }

  const [mergedPdfBytes, textPages] = await Promise.all([
    fs.readFile(mergedPdfPath),
    extractPdfPageTextItems(mergedPdfPath),
  ]);
  const sourcePdf = await PDFDocument.load(mergedPdfBytes);
  const totalPageCount = sourcePdf.getPageCount();

  if (textPages.length !== totalPageCount) {
    throw new Error(
      `PDF text/page count mismatch: text=${textPages.length} pdf=${totalPageCount}`,
    );
  }

  const markerPageIndexes = textPages
    .map((page, index) =>
      index > 0 && pageContainsApprovalMarker(page) ? index : -1,
    )
    .filter((index) => index >= 1);
  const markerApprovalStartIndex = markerPageIndexes.at(-1);
  const approvalMarkerFound = Number.isInteger(markerApprovalStartIndex);
  const approvalStartIndex = approvalMarkerFound
    ? markerApprovalStartIndex
    : totalPageCount - expectedApproval;
  if (approvalStartIndex < 1) {
    throw new Error(
      `Final order candidate has no order pages: total=${totalPageCount} approval=${expectedApproval}`,
    );
  }

  // Prefer the actual approval marker. Fall back to the already validated
  // standalone approval page count only when PDF font encoding prevents text
  // extraction. A marker-detected multi-page approval is therefore exposed to
  // the caller and cannot accidentally be counted as order content.

  await Promise.all([
    writePdfRange({
      sourcePdf,
      indexes: buildPageIndexes(0, approvalStartIndex),
      outputPath: orderPdfPath,
    }),
    writePdfRange({
      sourcePdf,
      indexes: buildPageIndexes(approvalStartIndex, totalPageCount),
      outputPath: approvalPdfPath,
    }),
  ]);

  return {
    totalPageCount,
    orderPageCount: approvalStartIndex,
    approvalPageCount: totalPageCount - approvalStartIndex,
    approvalStartPage: approvalStartIndex + 1,
    boundaryMode: approvalMarkerFound
      ? "approval-marker"
      : "expected-count-fallback",
    approvalMarkerFound,
  };
};

module.exports = splitFinalOrderCandidatePdf;
