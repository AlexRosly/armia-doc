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
  String(value).replace(/\s+/g, "").trim().toLowerCase();

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

const isSectPrNode = (node) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === "sectPr";

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

  return text.trim();
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

const getOrCreateRowProperties = (xmlDoc, trNode) => {
  for (let child = trNode.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === "trPr"
    ) {
      return child;
    }
  }

  const trPr = xmlDoc.createElementNS(WORD_NS, "w:trPr");

  if (trNode.firstChild) {
    trNode.insertBefore(trPr, trNode.firstChild);
  } else {
    trNode.appendChild(trPr);
  }

  return trPr;
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

const applyKeepNext = (xmlDoc, pNode) => {
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  ensureEmptyElement(xmlDoc, pPr, "keepNext");
};

const applyKeepLines = (xmlDoc, pNode) => {
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  ensureEmptyElement(xmlDoc, pPr, "keepLines");
};

const applyCantSplitToTableRows = (xmlDoc, tblNode) => {
  const rows = [];

  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (child.namespaceURI === WORD_NS && child.localName === "tr") {
        rows.push(child);
      } else {
        walk(child);
      }
    }
  };

  walk(tblNode);

  for (const trNode of rows) {
    const trPr = getOrCreateRowProperties(xmlDoc, trNode);
    ensureEmptyElement(xmlDoc, trPr, "cantSplit");
  }
};

const paragraphContainsAnyMarker = (pNode, markerTexts) => {
  const paragraphText = normalizeText(getParagraphText(pNode));
  if (!paragraphText) return false;

  return markerTexts.some((markerText) =>
    paragraphText.includes(normalizeText(markerText)),
  );
};

const findMarkerParagraphNodes = (bodyChildren, markerTexts) => {
  const nodes = [];

  for (const node of bodyChildren) {
    if (!isParagraphNode(node)) continue;

    if (paragraphContainsAnyMarker(node, markerTexts)) {
      nodes.push(node);
    }
  }

  return nodes;
};

const findPreviousNonEmptyParagraphNodes = (bodyChildren, fromIndex, count) => {
  const nodes = [];

  for (let i = fromIndex - 1; i >= 0; i--) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    const text = getParagraphText(node);
    if (!normalizeText(text)) continue;

    nodes.unshift(node);

    if (nodes.length === count) {
      break;
    }
  }

  return nodes;
};

const findNextTableNode = (bodyChildren, fromIndex) => {
  for (let i = fromIndex + 1; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];

    if (isSectPrNode(node)) break;
    if (isTableNode(node)) return node;
  }

  return null;
};

const fixSignatureTablePagination = (buffer, options = {}) => {
  const {
    markerTexts = ["__SIGNATURE_START__"],
    previousParagraphCount = 2,
    removeMarkerParagraph = true,
  } = options;

  const zip = new PizZip(buffer);
  const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
  const body = getBody(xmlDoc);
  const bodyChildren = getDirectChildElements(body);

  const markerNodes = findMarkerParagraphNodes(bodyChildren, markerTexts);

  if (!markerNodes.length) {
    return buffer;
  }

  for (const markerNode of markerNodes) {
    const currentChildren = getDirectChildElements(body);
    const markerIndex = currentChildren.indexOf(markerNode);
    if (markerIndex === -1) continue;

    const previousParagraphNodes = findPreviousNonEmptyParagraphNodes(
      currentChildren,
      markerIndex,
      previousParagraphCount,
    );

    for (const paragraphNode of previousParagraphNodes) {
      applyKeepNext(xmlDoc, paragraphNode);
      applyKeepLines(xmlDoc, paragraphNode);
    }

    applyKeepNext(xmlDoc, markerNode);
    applyKeepLines(xmlDoc, markerNode);

    const nextTableNode = findNextTableNode(currentChildren, markerIndex);
    if (nextTableNode) {
      applyCantSplitToTableRows(xmlDoc, nextTableNode);
    }
  }

  if (removeMarkerParagraph) {
    for (const markerNode of markerNodes) {
      if (markerNode.parentNode === body) {
        body.removeChild(markerNode);
      }
    }
  }

  zip.file("word/document.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = fixSignatureTablePagination;
