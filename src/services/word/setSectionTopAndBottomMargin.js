const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_DOCUMENT_PATH = "word/document.xml";
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const setMarginAttr = (pgMar, attrName, value) => {
  if (!pgMar) return;
  pgMar.setAttributeNS(W_NS, `w:${attrName}`, String(value));
};

const setSectionTopAndBottomMargin = (docxBuffer, topTwips, bottomTwips) => {
  if (!Buffer.isBuffer(docxBuffer)) {
    throw new Error(
      "setSectionTopAndBottomMargin: docxBuffer must be a Buffer",
    );
  }

  if (!Number.isInteger(topTwips) || topTwips <= 0) {
    throw new Error(
      "setSectionTopAndBottomMargin: topTwips must be a positive integer",
    );
  }

  if (!Number.isInteger(bottomTwips) || bottomTwips <= 0) {
    throw new Error(
      "setSectionTopAndBottomMargin: bottomTwips must be a positive integer",
    );
  }

  const zip = new PizZip(docxBuffer);
  const xml = zip.file(WORD_DOCUMENT_PATH)?.asText();

  if (!xml) {
    throw new Error(
      `setSectionTopAndBottomMargin: missing file ${WORD_DOCUMENT_PATH}`,
    );
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const serializer = new XMLSerializer();

  const sectPrNodes = document.getElementsByTagNameNS(W_NS, "sectPr");

  for (let i = 0; i < sectPrNodes.length; i++) {
    const sectPr = sectPrNodes[i];
    const pgMarNodes = sectPr.getElementsByTagNameNS(W_NS, "pgMar");

    if (!pgMarNodes || !pgMarNodes.length) {
      continue;
    }

    const pgMar = pgMarNodes[0];
    setMarginAttr(pgMar, "top", topTwips);
    setMarginAttr(pgMar, "bottom", bottomTwips);
  }

  const updatedXml = serializer.serializeToString(document);
  zip.file(WORD_DOCUMENT_PATH, updatedXml);

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = setSectionTopAndBottomMargin;
