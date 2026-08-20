const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const directElements = (node) => {
  const result = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) result.push(child);
  }
  return result;
};

const isWordElement = (node, name) =>
  node?.nodeType === 1 && node.namespaceURI === WORD_NS && node.localName === name;
const isParagraph = (node) => isWordElement(node, "p");
const isTable = (node) => isWordElement(node, "tbl");

const paragraphText = (paragraph) => {
  const texts = paragraph.getElementsByTagNameNS(WORD_NS, "t");
  let value = "";
  for (let i = 0; i < texts.length; i++) value += texts[i].textContent || "";
  return value.replace(/\s+/g, " ").trim();
};

const getOrCreateDirectChild = (doc, parent, name, first = false) => {
  const found = directElements(parent).find((node) => isWordElement(node, name));
  if (found) return found;
  const created = doc.createElementNS(WORD_NS, `w:${name}`);
  if (first && parent.firstChild) parent.insertBefore(created, parent.firstChild);
  else parent.appendChild(created);
  return created;
};

const ensureFlag = (doc, parent, name) => {
  if (!directElements(parent).some((node) => isWordElement(node, name))) {
    parent.appendChild(doc.createElementNS(WORD_NS, `w:${name}`));
  }
};

const removeFlag = (parent, name) => {
  for (const node of directElements(parent).filter((item) => isWordElement(item, name))) {
    parent.removeChild(node);
  }
};

const paragraphPPr = (doc, paragraph) =>
  getOrCreateDirectChild(doc, paragraph, "pPr", true);

const allDescendants = (node, name) => {
  const list = node.getElementsByTagNameNS(WORD_NS, name);
  return Array.from({ length: list.length }, (_, index) => list[index]);
};

const containsMarker = (paragraph, markers) => {
  const text = paragraphText(paragraph).toLowerCase();
  return markers.some((marker) => text.includes(String(marker).toLowerCase()));
};

const paragraphHasSectPr = (paragraph) =>
  paragraph.getElementsByTagNameNS(WORD_NS, "sectPr").length > 0;

const clearMarkerText = (paragraph, markers) => {
  const lowerMarkers = markers.map((value) => String(value).toLowerCase());
  for (const textNode of allDescendants(paragraph, "t")) {
    const value = textNode.textContent || "";
    if (lowerMarkers.some((marker) => value.toLowerCase().includes(marker))) {
      textNode.textContent = "";
    }
  }
};

const protectWholeSignatureTable = (doc, table) => {
  const rows = allDescendants(table, "tr");
  for (const row of rows) {
    const trPr = getOrCreateDirectChild(doc, row, "trPr", true);
    ensureFlag(doc, trPr, "cantSplit");
  }

  const paragraphs = allDescendants(table, "p");
  for (let index = 0; index < paragraphs.length; index++) {
    const pPr = paragraphPPr(doc, paragraphs[index]);
    ensureFlag(doc, pPr, "keepLines");
    if (index < paragraphs.length - 1) ensureFlag(doc, pPr, "keepNext");
    else removeFlag(pPr, "keepNext");
  }
};

const isDirectiveParagraph = (paragraph) => {
  if (!isParagraph(paragraph)) return false;
  if (paragraph.getElementsByTagNameNS(WORD_NS, "numPr").length) return true;
  return /^\d+[.)]\s*/.test(paragraphText(paragraph));
};

const fixSignatureTablePagination = (buffer, options = {}) => {
  const markers = Array.isArray(options.markerTexts) && options.markerTexts.length
    ? options.markerTexts
    : ["__SIGNATURE_START__"];
  const zip = new PizZip(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("DOCX does not contain word/document.xml");

  const doc = new DOMParser().parseFromString(file.asText(), "application/xml");
  const body = doc.getElementsByTagNameNS(WORD_NS, "body")[0];
  if (!body) return buffer;
  let children = directElements(body);
  const markerIndex = children.findIndex(
    (node) => isParagraph(node) && containsMarker(node, markers),
  );
  if (markerIndex < 0) return buffer;

  const markerParagraph = children[markerIndex];
  const tableIndex = children.findIndex(
    (node, index) => index > markerIndex && isTable(node),
  );
  if (tableIndex >= 0) protectWholeSignatureTable(doc, children[tableIndex]);

  if (options.orderTailMode) {
    for (let index = markerIndex - 1; index >= 0; index--) {
      if (!isDirectiveParagraph(children[index])) continue;
      const pPr = paragraphPPr(doc, children[index]);
      removeFlag(pPr, "keepNext");
      removeFlag(pPr, "keepLines");
      removeFlag(pPr, "pageBreakBefore");
      break;
    }

    if (tableIndex > markerIndex + 1) {
      const gap = children
        .slice(markerIndex + 1, tableIndex)
        .find((node) => isParagraph(node));
      if (gap) {
        const pPr = paragraphPPr(doc, gap);
        ensureFlag(doc, pPr, "keepNext");
        removeFlag(pPr, "keepLines");
      }
    }
  }

  if (options.removeMarkerParagraph) {
    if (paragraphHasSectPr(markerParagraph)) clearMarkerText(markerParagraph, markers);
    else body.removeChild(markerParagraph);
  }

  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
};

module.exports = fixSignatureTablePagination;
