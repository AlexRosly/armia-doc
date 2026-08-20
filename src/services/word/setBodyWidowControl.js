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

const setWidowControl = (xmlDoc, paragraph, enabled) => {
  const pPr = getOrCreatePPr(xmlDoc, paragraph);
  let widowControl = directElements(pPr).find((node) =>
    isWordElement(node, "widowControl"),
  );
  if (!widowControl) {
    widowControl = xmlDoc.createElementNS(WORD_NS, "w:widowControl");
    pPr.appendChild(widowControl);
  }
  widowControl.setAttribute("w:val", enabled ? "1" : "0");
};

const matchesAny = (text, markers) => {
  const normalized = normalizeText(text);
  return markers.some((marker) => normalized === normalizeText(marker));
};

const containsAny = (text, markers) => {
  const normalized = normalizeText(text);
  return markers.some((marker) => normalized.includes(normalizeText(marker)));
};

const setBodyWidowControl = (buffer, options = {}) => {
  const startAfterTexts = Array.isArray(options.startAfterTexts)
    ? options.startAfterTexts.filter(Boolean)
    : [];
  const stopBeforeTexts = Array.isArray(options.stopBeforeTexts)
    ? options.stopBeforeTexts.filter(Boolean)
    : [];
  const excludedTexts = Array.isArray(options.excludedTexts)
    ? options.excludedTexts.filter(Boolean)
    : [];
  const enabled = options.enabled !== false;

  if (!startAfterTexts.length || !stopBeforeTexts.length) return buffer;

  const zip = new PizZip(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("DOCX does not contain word/document.xml");

  const xmlDoc = new DOMParser().parseFromString(
    file.asText(),
    "application/xml",
  );
  const body = xmlDoc.getElementsByTagNameNS(WORD_NS, "body")[0];
  if (!body) return buffer;

  let insideScope = false;
  let changed = false;

  for (const node of directElements(body)) {
    if (!isWordElement(node, "p")) continue;
    const text = paragraphText(node);

    if (!insideScope && matchesAny(text, startAfterTexts)) {
      insideScope = true;
      continue;
    }
    if (!insideScope) continue;
    if (containsAny(text, stopBeforeTexts)) break;
    if (!text || containsAny(text, excludedTexts)) continue;

    setWidowControl(xmlDoc, node, enabled);
    changed = true;
  }

  if (!changed) return buffer;

  zip.file(
    "word/document.xml",
    new XMLSerializer().serializeToString(xmlDoc),
  );
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
};

module.exports = setBodyWidowControl;
