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

const isTableNode = (node) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === "tbl";

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

const hasChildElement = (parent, localName) => {
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === localName
    ) {
      return true;
    }
  }

  return false;
};

const ensureEmptyElement = (xmlDoc, parent, localName) => {
  if (hasChildElement(parent, localName)) return;
  const node = xmlDoc.createElementNS(WORD_NS, `w:${localName}`);
  parent.appendChild(node);
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

const applyKeepNext = (xmlDoc, pNode) => {
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  ensureEmptyElement(xmlDoc, pPr, "keepNext");
};

const removeKeepNext = (xmlDoc, pNode) => {
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  removeChildElementIfExists(pPr, "keepNext");
};

const removeKeepLines = (xmlDoc, pNode) => {
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  removeChildElementIfExists(pPr, "keepLines");
};

const removePageBreakBefore = (xmlDoc, pNode) => {
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  removeChildElementIfExists(pPr, "pageBreakBefore");
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

const findNextNonEmptyParagraphIndex = (bodyChildren, fromIndex) => {
  for (let i = fromIndex + 1; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    const text = normalizeText(getParagraphText(node));
    if (text) return i;
  }

  return -1;
};

const hasNumberingProperties = (pNode) => {
  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (child.namespaceURI === WORD_NS && child.localName === "numPr") {
        return true;
      }

      if (walk(child)) {
        return true;
      }
    }

    return false;
  };

  return walk(pNode);
};

const isDirectiveListParagraphByText = (text) =>
  /^\d+[\.\)]\s*/.test(String(text || "").trim());

const isDirectiveListParagraph = (pNode) => {
  if (!isParagraphNode(pNode)) return false;

  if (hasNumberingProperties(pNode)) {
    return true;
  }

  const text = getParagraphText(pNode);
  return isDirectiveListParagraphByText(text);
};

const fixOrderDirectiveSectionPagination = (buffer, options = {}) => {
  const {
    markerText = "НАКАЗУЮ:",
    stopBeforeTable = true,
    stopBeforeSignatureMarker = "__SIGNATURE_START__",
  } = options;

  const zip = new PizZip(buffer);
  const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
  const body = getBody(xmlDoc);
  const bodyChildren = getDirectChildElements(body);

  const markerIndex = findParagraphIndexByText(bodyChildren, markerText);
  if (markerIndex === -1) {
    return buffer;
  }

  const firstContentIndex = findNextNonEmptyParagraphIndex(
    bodyChildren,
    markerIndex,
  );
  if (firstContentIndex === -1) {
    return buffer;
  }

  const markerParagraph = bodyChildren[markerIndex];
  applyKeepNext(xmlDoc, markerParagraph);

  for (let i = firstContentIndex; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];

    if (stopBeforeTable && isTableNode(node)) {
      break;
    }

    if (!isParagraphNode(node)) {
      continue;
    }

    const text = getParagraphText(node);
    const normalized = normalizeText(text);

    if (!normalized) {
      continue;
    }

    if (
      stopBeforeSignatureMarker &&
      normalized.includes(normalizeText(stopBeforeSignatureMarker))
    ) {
      break;
    }

    if (!isDirectiveListParagraph(node)) {
      continue;
    }

    removeKeepNext(xmlDoc, node);
    removeKeepLines(xmlDoc, node);
    removePageBreakBefore(xmlDoc, node);
  }

  const firstDirectiveParagraph = bodyChildren[firstContentIndex];
  if (isDirectiveListParagraph(firstDirectiveParagraph)) {
    removeKeepLines(xmlDoc, firstDirectiveParagraph);
    removePageBreakBefore(xmlDoc, firstDirectiveParagraph);
  }

  zip.file("word/document.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = fixOrderDirectiveSectionPagination;
