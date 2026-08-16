const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const parseXml = (xml) =>
  new DOMParser().parseFromString(xml, "application/xml");

const serializeXml = (doc) => new XMLSerializer().serializeToString(doc);

const normalizeText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim().toLowerCase();

const getFileText = (zip, name) => {
  const file = zip.file(name);
  if (!file) {
    throw new Error(`DOCX does not contain ${name}`);
  }
  return file.asText();
};

const isWordElement = (node, localName) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === localName;

const getBody = (xmlDoc) => {
  const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");
  if (!bodies.length) {
    throw new Error("Cannot find w:body in word/document.xml");
  }
  return bodies[0];
};

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

const getDirectBodyChildElements = (body) => {
  const result = [];

  for (let child = body.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) {
      result.push(child);
    }
  }

  return result;
};

const getAllParagraphs = (root) => {
  const result = [];

  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (isWordElement(child, "p")) {
        result.push(child);
      }

      walk(child);
    }
  };

  walk(root);
  return result;
};

const getOrCreateParagraphProperties = (xmlDoc, pNode) => {
  for (let child = pNode.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, "pPr")) {
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

const removeChildElementsByLocalName = (parent, localName) => {
  const toRemove = [];

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) {
      toRemove.push(child);
    }
  }

  for (const node of toRemove) {
    parent.removeChild(node);
  }

  return toRemove.length;
};

const findStopIndexByMarkerText = (bodyChildren, markerText) => {
  if (!markerText) return -1;

  const normalizedTarget = normalizeText(markerText);

  for (let i = 0; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];
    if (!isWordElement(node, "p")) continue;

    const text = normalizeText(getParagraphText(node));
    if (text.includes(normalizedTarget)) {
      return i;
    }
  }

  return -1;
};

const collectParagraphsBeforeBodyChildIndex = (bodyChildren, stopIndex) => {
  const result = [];

  const collectFromNode = (node) => {
    result.push(...getAllParagraphs(node));
  };

  const endIndex =
    stopIndex >= 0
      ? Math.min(stopIndex, bodyChildren.length)
      : bodyChildren.length;

  for (let i = 0; i < endIndex; i++) {
    collectFromNode(bodyChildren[i]);
  }

  return result;
};

const normalizeDocumentParagraphPagination = (buffer, options = {}) => {
  const {
    removeKeepNext = true,
    removeKeepLines = true,
    removePageBreakBefore = true,
    removeWidowControl = false,
    stopBeforeMarkerText = null,
  } = options;

  const zip = new PizZip(buffer);
  const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
  const body = getBody(xmlDoc);
  const bodyChildren = getDirectBodyChildElements(body);

  const stopIndex = findStopIndexByMarkerText(
    bodyChildren,
    stopBeforeMarkerText,
  );

  const paragraphs =
    stopIndex >= 0
      ? collectParagraphsBeforeBodyChildIndex(bodyChildren, stopIndex)
      : getAllParagraphs(body);

  let removedCount = 0;

  for (const pNode of paragraphs) {
    const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
    let localRemoved = 0;

    if (removeKeepNext) {
      localRemoved += removeChildElementsByLocalName(pPr, "keepNext");
    }

    if (removeKeepLines) {
      localRemoved += removeChildElementsByLocalName(pPr, "keepLines");
    }

    if (removePageBreakBefore) {
      localRemoved += removeChildElementsByLocalName(pPr, "pageBreakBefore");
    }

    if (removeWidowControl) {
      localRemoved += removeChildElementsByLocalName(pPr, "widowControl");
    }

    removedCount += localRemoved;
  }

  if (removedCount === 0) {
    return buffer;
  }

  zip.file("word/document.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = normalizeDocumentParagraphPagination;
