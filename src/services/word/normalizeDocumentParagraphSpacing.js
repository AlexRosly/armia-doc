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

const findSpacingNode = (pPr) => {
  for (let child = pPr.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, "spacing")) {
      return child;
    }
  }
  return null;
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

const paragraphIsMeaningfullyEmpty = (pNode) =>
  normalizeText(getParagraphText(pNode)) === "";

const shouldSkipParagraph = (pNode, options = {}) => {
  const {
    skipExactTexts = [],
    skipIfContainsTexts = [],
    skipEmptyParagraphs = true,
  } = options;

  const text = normalizeText(getParagraphText(pNode));

  if (skipEmptyParagraphs && !text) {
    return true;
  }

  if (skipExactTexts.some((item) => text === normalizeText(item))) {
    return true;
  }

  if (skipIfContainsTexts.some((item) => text.includes(normalizeText(item)))) {
    return true;
  }

  return false;
};

const removeSnapToGridNode = (pPr) => {
  let removed = false;

  for (let child = pPr.firstChild; child; ) {
    const next = child.nextSibling;

    if (isWordElement(child, "snapToGrid")) {
      pPr.removeChild(child);
      removed = true;
    }

    child = next;
  }

  return removed;
};

const normalizeDocumentParagraphSpacing = (buffer, options = {}) => {
  const {
    stopBeforeMarkerText = null,
    removeSpacingBefore = true,
    removeSpacingAfter = true,
    removeLineSpacing = true,
    removeSnapToGrid = true,
    setSpacingBeforeTwips = 0,
    setSpacingAfterTwips = 0,
    skipExactTexts = [],
    skipIfContainsTexts = [],
    skipEmptyParagraphs = true,
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

  let changed = false;

  for (const pNode of paragraphs) {
    if (
      shouldSkipParagraph(pNode, {
        skipExactTexts,
        skipIfContainsTexts,
        skipEmptyParagraphs,
      })
    ) {
      continue;
    }

    const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
    let spacing = findSpacingNode(pPr);

    if (!spacing) {
      spacing = xmlDoc.createElementNS(WORD_NS, "w:spacing");
      pPr.appendChild(spacing);
    }

    if (removeSpacingBefore) {
      const current = spacing.getAttribute("w:before");
      const next = String(setSpacingBeforeTwips);
      if (current !== next) {
        spacing.setAttribute("w:before", next);
        changed = true;
      }
    }

    if (removeSpacingAfter) {
      const current = spacing.getAttribute("w:after");
      const next = String(setSpacingAfterTwips);
      if (current !== next) {
        spacing.setAttribute("w:after", next);
        changed = true;
      }
    }

    if (removeLineSpacing) {
      if (spacing.hasAttribute("w:line")) {
        spacing.removeAttribute("w:line");
        changed = true;
      }

      if (spacing.hasAttribute("w:lineRule")) {
        spacing.removeAttribute("w:lineRule");
        changed = true;
      }
    }

    if (removeSnapToGrid) {
      if (removeSnapToGridNode(pPr)) {
        changed = true;
      }
    }
  }

  if (!changed) {
    return buffer;
  }

  zip.file("word/document.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = normalizeDocumentParagraphSpacing;
