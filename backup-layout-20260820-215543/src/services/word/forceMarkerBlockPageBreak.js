const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const normalizeText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim().toLowerCase();

const directElements = (node) => {
  const result = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) result.push(child);
  }
  return result;
};

const isWordElement = (node, localName) =>
  node?.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === localName;

const paragraphText = (paragraph) => {
  const textNodes = paragraph.getElementsByTagNameNS(WORD_NS, "t");
  let result = "";
  for (let index = 0; index < textNodes.length; index++) {
    result += textNodes[index].textContent || "";
  }
  return result.replace(/\s+/g, " ").trim();
};

const getOrCreatePPr = (xmlDoc, paragraph) => {
  const current = directElements(paragraph).find((node) =>
    isWordElement(node, "pPr"),
  );
  if (current) return current;

  const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");
  if (paragraph.firstChild) paragraph.insertBefore(pPr, paragraph.firstChild);
  else paragraph.appendChild(pPr);
  return pPr;
};

const setOnOffFlag = (xmlDoc, pPr, localName, enabled) => {
  for (const child of directElements(pPr)) {
    if (isWordElement(child, localName)) pPr.removeChild(child);
  }

  if (!enabled) return;
  const flag = xmlDoc.createElementNS(WORD_NS, `w:${localName}`);
  flag.setAttribute("w:val", "1");
  pPr.appendChild(flag);
};

const findFollowingParagraphs = (bodyChildren, markerIndex, limit) => {
  const result = [];

  for (let index = markerIndex + 1; index < bodyChildren.length; index++) {
    const node = bodyChildren[index];

    // Do not cross into a signature or another table-based block.
    if (isWordElement(node, "tbl")) break;
    if (!isWordElement(node, "p") || !normalizeText(paragraphText(node))) {
      continue;
    }

    result.push(node);
    if (result.length >= limit) break;
  }

  return result;
};

/**
 * Emergency PDF-feedback repair. It is used only after validation has proved
 * that ПРОШУ:/НАКАЗУЮ: has fewer than two visible lines below it.
 *
 * The marker starts a fresh page, stays with the first content paragraph, and
 * the first two content paragraphs are protected as one short chain. This is
 * deliberately local: section properties, margins, styles and body text are
 * not rewritten.
 */
const forceMarkerBlockPageBreak = (buffer, options = {}) => {
  const markerText = normalizeText(options.markerText);
  if (!markerText) return buffer;

  const zip = new PizZip(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("DOCX does not contain word/document.xml");

  const xmlDoc = new DOMParser().parseFromString(
    file.asText(),
    "application/xml",
  );
  const body = xmlDoc.getElementsByTagNameNS(WORD_NS, "body")[0];
  if (!body) return buffer;

  const bodyChildren = directElements(body);
  const markerIndex = bodyChildren.findIndex(
    (node) =>
      isWordElement(node, "p") &&
      normalizeText(paragraphText(node)).includes(markerText),
  );
  if (markerIndex < 0) return buffer;

  const markerParagraph = bodyChildren[markerIndex];
  const markerPPr = getOrCreatePPr(xmlDoc, markerParagraph);
  setOnOffFlag(xmlDoc, markerPPr, "pageBreakBefore", true);
  setOnOffFlag(xmlDoc, markerPPr, "keepNext", true);
  setOnOffFlag(xmlDoc, markerPPr, "keepLines", true);

  const following = findFollowingParagraphs(bodyChildren, markerIndex, 2);
  for (const paragraph of following) {
    const pPr = getOrCreatePPr(xmlDoc, paragraph);
    setOnOffFlag(xmlDoc, pPr, "pageBreakBefore", false);
    setOnOffFlag(xmlDoc, pPr, "widowControl", true);
  }

  // When the first content paragraph is only one rendered line, keep it with
  // the second paragraph so the marker still receives two real text lines.
  if (following.length >= 2) {
    setOnOffFlag(
      xmlDoc,
      getOrCreatePPr(xmlDoc, following[0]),
      "keepNext",
      true,
    );
  }

  zip.file(
    "word/document.xml",
    new XMLSerializer().serializeToString(xmlDoc),
  );
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
};

module.exports = forceMarkerBlockPageBreak;
