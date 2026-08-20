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

const isParagraph = (node) =>
  node?.nodeType === 1 && node.namespaceURI === WORD_NS && node.localName === "p";

const paragraphText = (node) => {
  const texts = node.getElementsByTagNameNS(WORD_NS, "t");
  let result = "";
  for (let i = 0; i < texts.length; i++) result += texts[i].textContent || "";
  return result.replace(/\s+/g, " ").trim();
};

const getOrCreatePPr = (doc, paragraph) => {
  for (const child of directElements(paragraph)) {
    if (child.namespaceURI === WORD_NS && child.localName === "pPr") return child;
  }
  const pPr = doc.createElementNS(WORD_NS, "w:pPr");
  paragraph.insertBefore(pPr, paragraph.firstChild);
  return pPr;
};

const removeFlag = (pPr, name) => {
  for (const child of directElements(pPr)) {
    if (child.namespaceURI === WORD_NS && child.localName === name) {
      pPr.removeChild(child);
    }
  }
};

const setFlagEnabled = (doc, pPr, name) => {
  removeFlag(pPr, name);
  const flag = doc.createElementNS(WORD_NS, `w:${name}`);
  flag.setAttribute("w:val", "1");
  pPr.appendChild(flag);
};

const fixOrderNakazuiuPagination = (buffer, options = {}) => {
  const marker = String(options.markerText || "НАКАЗУЮ:").toLowerCase();
  const zip = new PizZip(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("DOCX does not contain word/document.xml");

  const doc = new DOMParser().parseFromString(file.asText(), "application/xml");
  const body = doc.getElementsByTagNameNS(WORD_NS, "body")[0];
  if (!body) return buffer;
  const children = directElements(body);
  const markerIndex = children.findIndex(
    (node) => isParagraph(node) && paragraphText(node).toLowerCase().includes(marker),
  );
  if (markerIndex < 0) return buffer;

  // Keep only the label with the first directive paragraph. Do not chain the
  // first point to the second paragraph: PDF validation enforces two real lines.
  const markerPPr = getOrCreatePPr(doc, children[markerIndex]);
  setFlagEnabled(doc, markerPPr, "keepNext");
  setFlagEnabled(doc, markerPPr, "keepLines");

  const firstPoint = children
    .slice(markerIndex + 1)
    .find((node) => isParagraph(node) && paragraphText(node));

  if (firstPoint) {
    const firstPointPPr = getOrCreatePPr(doc, firstPoint);
    removeFlag(firstPointPPr, "keepNext");
    removeFlag(firstPointPPr, "keepLines");
    removeFlag(firstPointPPr, "pageBreakBefore");
    // setBodyWidowControl may already have written w:widowControl w:val="0".
    // Replacing the element (instead of merely ensuring it exists) is required
    // to guarantee at least two lines of the first directive on the page.
    setFlagEnabled(doc, firstPointPPr, "widowControl");
  }

  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
};

module.exports = fixOrderNakazuiuPagination;
