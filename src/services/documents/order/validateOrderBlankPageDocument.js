const fs = require("fs/promises");
const path = require("path");
const PizZip = require("pizzip");
const { convertToPdf } = require("../../pdf");
const validateLayout = require("../../layout/validateLayout");
const ORDER_PRINT_ERRORS = require("./orderPrintErrors");

const extractDocumentXmlText = async (docxPath) => {
  const buffer = await fs.readFile(docxPath);
  const zip = new PizZip(buffer);
  const documentFile = zip.file("word/document.xml");

  if (!documentFile) {
    return "";
  }

  return documentFile.asText();
};

const hasMirrorMargins = async (docxPath) => {
  const buffer = await fs.readFile(docxPath);
  const zip = new PizZip(buffer);
  const settingsFile = zip.file("word/settings.xml");
  const settingsXml = settingsFile ? settingsFile.asText() : "";

  return /<w:mirrorMargins\b[^>]*\/>/.test(settingsXml);
};

const hasVisibleTextRuns = (documentXml) => {
  return /<w:t[^>]*>\s*[^<\s][^<]*<\/w:t>/u.test(documentXml);
};

const validateOrderBlankPageDocument = async ({
  docxPath,
  pdfDir,
  buildPdfPath,
}) => {
  const errors = [];

  const mirrorMarginsEnabled = await hasMirrorMargins(docxPath);
  if (mirrorMarginsEnabled) {
    errors.push(ORDER_PRINT_ERRORS.MIRROR_MARGINS_ENABLED);
  }

  const documentXml = await extractDocumentXmlText(docxPath);
  if (hasVisibleTextRuns(documentXml)) {
    errors.push(ORDER_PRINT_ERRORS.BLANK_PAGE_NOT_EMPTY);
  }

  await convertToPdf(docxPath, pdfDir);
  const pdfPath = buildPdfPath(docxPath, pdfDir);

  const layout = await validateLayout(pdfPath, {
    documentType: "order",
    markers: {},
  });

  const pageCount = Array.isArray(layout?.pages) ? layout.pages.length : 0;

  if (pageCount !== 1) {
    errors.push(ORDER_PRINT_ERRORS.PAGE_COUNT_INVALID);
  }

  return {
    ok: errors.length === 0,
    errors,
    meta: {
      pdfPath,
      pageCount,
      mirrorMarginsEnabled,
      hasVisibleText: hasVisibleTextRuns(documentXml),
    },
  };
};

module.exports = validateOrderBlankPageDocument;
