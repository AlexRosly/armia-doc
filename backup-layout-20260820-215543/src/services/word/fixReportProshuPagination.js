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

const getChildElementsByLocalName = (parent, localName) => {
  const result = [];

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === localName
    ) {
      result.push(child);
    }
  }

  return result;
};

const removeChildElementIfExists = (parent, localName) => {
  for (const node of getChildElementsByLocalName(parent, localName)) {
    parent.removeChild(node);
  }
};

const setOnOffFlag = (xmlDoc, pPr, localName, enabled) => {
  removeChildElementIfExists(pPr, localName);
  if (!enabled) return;

  const flag = xmlDoc.createElementNS(WORD_NS, `w:${localName}`);
  flag.setAttribute("w:val", "1");
  pPr.appendChild(flag);
};

const paragraphHasSectionProperties = (pNode) => {
  const sectionNodes = pNode.getElementsByTagNameNS(WORD_NS, "sectPr");
  return sectionNodes.length > 0;
};

const removeParagraphPaginationFlags = (xmlDoc, pNode) => {
  if (!pNode) return false;

  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  const before = pPr.toString();

  removeChildElementIfExists(pPr, "keepNext");
  removeChildElementIfExists(pPr, "keepLines");
  removeChildElementIfExists(pPr, "pageBreakBefore");

  // w:sectPr не чіпаємо: його видалення змінює поля, орієнтацію та секції.
  return before !== pPr.toString();
};

const setParagraphSpacingAfter = (xmlDoc, pNode, afterTwips) => {
  if (!pNode || !Number.isFinite(afterTwips)) return false;

  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  let spacing = getChildElementsByLocalName(pPr, "spacing")[0] || null;

  if (!spacing) {
    spacing = xmlDoc.createElementNS(WORD_NS, "w:spacing");
    pPr.appendChild(spacing);
  }

  spacing.setAttribute("w:after", String(afterTwips));
  return true;
};

const paragraphHasOnlyBreakLikeContent = (pNode) => {
  const text = normalizeText(getParagraphText(pNode));
  if (text) return false;

  let hasMeaningfulContent = false;

  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (child.namespaceURI !== WORD_NS) {
        hasMeaningfulContent = true;
        continue;
      }

      const name = child.localName;

      if (name === "t" && normalizeText(child.textContent || "")) {
        hasMeaningfulContent = true;
        continue;
      }

      if (
        name !== "proofErr" &&
        name !== "bookmarkStart" &&
        name !== "bookmarkEnd" &&
        name !== "rPr" &&
        name !== "pPr" &&
        name !== "br" &&
        name !== "lastRenderedPageBreak"
      ) {
        walk(child);
      }
    }
  };

  walk(pNode);
  return !hasMeaningfulContent;
};

const removeParagraphNode = (node) => {
  if (!node?.parentNode) return false;
  node.parentNode.removeChild(node);
  return true;
};

const findParagraphIndexByText = (bodyChildren, targetText) => {
  const normalizedTarget = normalizeText(targetText);

  for (let i = 0; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    if (normalizeText(getParagraphText(node)).includes(normalizedTarget)) {
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

    if (normalizeText(getParagraphText(node)).includes(normalizedTarget)) {
      return i;
    }
  }

  return -1;
};

const findNextNonEmptyParagraphIndex = (bodyChildren, fromIndex) => {
  for (let i = fromIndex + 1; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    if (normalizeText(getParagraphText(node))) return i;
  }

  return -1;
};

const cleanupIntermediateParagraphs = (
  xmlDoc,
  bodyChildren,
  startIndex,
  endIndex,
  options = {},
) => {
  const {
    removeEmptyParagraphsBetween = true,
    stripPaginationFlagsFromIntermediate = true,
  } = options;

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex + 1) {
    return;
  }

  for (let i = endIndex - 1; i > startIndex; i--) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    if (stripPaginationFlagsFromIntermediate) {
      removeParagraphPaginationFlags(xmlDoc, node);
    }

    if (
      removeEmptyParagraphsBetween &&
      !paragraphHasSectionProperties(node) &&
      paragraphHasOnlyBreakLikeContent(node) &&
      removeParagraphNode(node)
    ) {
      bodyChildren.splice(i, 1);
    }
  }
};

const fixReportProshuPagination = (buffer, options = {}) => {
  const {
    markerText = "ПРОШУ:",
    previousContextText = "На підставі вищезазначеного,",
    normalizeProshuSpacingAfter = false,
    proshuSpacingAfterTwips = null,
    removeEmptyParagraphsBetween = true,
    stripPaginationFlagsFromIntermediate = true,
  } = options;

  const zip = new PizZip(buffer);
  const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
  const body = getBody(xmlDoc);
  const bodyChildren = getDirectChildElements(body);

  const proshuIndex = findParagraphIndexByText(bodyChildren, markerText);
  if (proshuIndex === -1) return buffer;

  const previousIndex = findPreviousMatchingParagraphIndex(
    bodyChildren,
    proshuIndex,
    previousContextText,
  );
  let nextIndex = findNextNonEmptyParagraphIndex(bodyChildren, proshuIndex);

  if (previousIndex !== -1) {
    removeParagraphPaginationFlags(xmlDoc, bodyChildren[previousIndex]);
  }

  removeParagraphPaginationFlags(xmlDoc, bodyChildren[proshuIndex]);

  if (normalizeProshuSpacingAfter && Number.isFinite(proshuSpacingAfterTwips)) {
    setParagraphSpacingAfter(
      xmlDoc,
      bodyChildren[proshuIndex],
      proshuSpacingAfterTwips,
    );
  }

  cleanupIntermediateParagraphs(xmlDoc, bodyChildren, proshuIndex, nextIndex, {
    removeEmptyParagraphsBetween,
    stripPaginationFlagsFromIntermediate,
  });

  nextIndex = findNextNonEmptyParagraphIndex(bodyChildren, proshuIndex);
  if (nextIndex !== -1) {
    removeParagraphPaginationFlags(xmlDoc, bodyChildren[nextIndex]);

    // The body optimizer intentionally disables widow/orphan control, but the
    // first request paragraph is the local exception: Word must keep at least
    // two of its lines together with ПРОШУ: whenever it wraps.
    const nextPPr = getOrCreateParagraphProperties(
      xmlDoc,
      bodyChildren[nextIndex],
    );
    setOnOffFlag(xmlDoc, nextPPr, "widowControl", true);
  }

  const proshuPPr = getOrCreateParagraphProperties(
    xmlDoc,
    bodyChildren[proshuIndex],
  );
  setOnOffFlag(xmlDoc, proshuPPr, "keepNext", true);
  setOnOffFlag(xmlDoc, proshuPPr, "keepLines", true);

  zip.file("word/document.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = fixReportProshuPagination;
