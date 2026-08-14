const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const getFileText = (zip, name) => {
  const file = zip.file(name);
  if (!file) {
    throw new Error(`DOCX does not contain ${name}`);
  }
  return file.asText();
};

const parseXml = (xml) =>
  new DOMParser().parseFromString(xml, "application/xml");

const serializeXml = (doc) => new XMLSerializer().serializeToString(doc);

const normalizeText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim().toLowerCase();

const getBody = (xmlDoc) => {
  const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");
  if (!bodies.length) {
    throw new Error("Cannot find w:body in word/document.xml");
  }
  return bodies[0];
};

const getDirectChildElements = (node) => {
  const result = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) result.push(child);
  }
  return result;
};

const isParagraphNode = (node) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === "p";

const getParagraphText = (pNode) => {
  let text = "";

  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (
        child.namespaceURI === WORD_NS &&
        child.localName === "t" &&
        child.textContent
      ) {
        text += child.textContent;
      } else {
        walk(child);
      }
    }
  };

  walk(pNode);

  return text.replace(/\s+/g, " ").trim();
};

const getOrCreateParagraphProperties = (xmlDoc, pNode) => {
  for (let child = pNode.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === "pPr"
    ) {
      return child;
    }
  }

  const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

  if (pNode.firstChild) {
    pNode.insertBefore(pPr, pNode.firstChild);
  } else {
    pNode.appendChild(pPr);
  }

  return pPr;
};

const removeChildElementIfExists = (parent, localName) => {
  const toRemove = [];

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === localName
    ) {
      toRemove.push(child);
    }
  }

  for (const node of toRemove) {
    parent.removeChild(node);
  }
};

const ensureEmptyElementFirst = (xmlDoc, parent, localName) => {
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === localName
    ) {
      return child;
    }
  }

  const node = xmlDoc.createElementNS(WORD_NS, `w:${localName}`);

  if (parent.firstChild) {
    parent.insertBefore(node, parent.firstChild);
  } else {
    parent.appendChild(node);
  }

  return node;
};

const findParagraphIndexByText = (bodyChildren, targetText) => {
  const normalizedTarget = normalizeText(targetText);

  for (let i = 0; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    const text = normalizeText(getParagraphText(node));
    if (text.includes(normalizedTarget)) {
      return i;
    }
  }

  return -1;
};

const findPreviousMatchingParagraphIndex = (
  bodyChildren,
  fromIndex,
  targetText,
) => {
  const normalizedTarget = normalizeText(targetText);

  for (let i = fromIndex - 1; i >= 0; i--) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    const text = normalizeText(getParagraphText(node));
    if (text.includes(normalizedTarget)) {
      return i;
    }
  }

  return -1;
};

const applyPageBreakBefore = (xmlDoc, pNode) => {
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);

  removeChildElementIfExists(pPr, "sectPr");
  ensureEmptyElementFirst(xmlDoc, pPr, "pageBreakBefore");
};

const forceReportProshuBlockToNextPage = (buffer, options = {}) => {
  const {
    markerText = "ПРОШУ:",
    previousContextText = "На підставі вищезазначеного,",
  } = options;

  const zip = new PizZip(buffer);
  const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
  const body = getBody(xmlDoc);
  const bodyChildren = getDirectChildElements(body);

  const proshuIndex = findParagraphIndexByText(bodyChildren, markerText);
  if (proshuIndex === -1) {
    return buffer;
  }

  let blockStartIndex = findPreviousMatchingParagraphIndex(
    bodyChildren,
    proshuIndex,
    previousContextText,
  );

  if (blockStartIndex === -1) {
    blockStartIndex = proshuIndex;
  }

  const blockStartParagraph = bodyChildren[blockStartIndex];
  applyPageBreakBefore(xmlDoc, blockStartParagraph);

  zip.file("word/document.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = forceReportProshuBlockToNextPage;
