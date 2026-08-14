// const PizZip = require("pizzip");
// const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

// const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// const getFileText = (zip, name) => {
//   const file = zip.file(name);
//   if (!file) {
//     throw new Error(`DOCX does not contain ${name}`);
//   }
//   return file.asText();
// };

// const parseXml = (xml) =>
//   new DOMParser().parseFromString(xml, "application/xml");

// const serializeXml = (doc) => new XMLSerializer().serializeToString(doc);

// const getBody = (xmlDoc) => {
//   const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");
//   if (!bodies.length) {
//     throw new Error("Cannot find w:body in word/document.xml");
//   }
//   return bodies[0];
// };

// const getDirectChildElements = (node) => {
//   const result = [];
//   for (let child = node.firstChild; child; child = child.nextSibling) {
//     if (child.nodeType === 1) result.push(child);
//   }
//   return result;
// };

// const isParagraphNode = (node) =>
//   node &&
//   node.nodeType === 1 &&
//   node.namespaceURI === WORD_NS &&
//   node.localName === "p";

// const getParagraphText = (pNode) => {
//   let text = "";

//   const walk = (node) => {
//     for (let child = node.firstChild; child; child = child.nextSibling) {
//       if (child.nodeType !== 1) continue;

//       if (
//         child.namespaceURI === WORD_NS &&
//         child.localName === "t" &&
//         child.textContent
//       ) {
//         text += child.textContent;
//       } else {
//         walk(child);
//       }
//     }
//   };

//   walk(pNode);

//   return text.replace(/\s+/g, " ").trim();
// };

// const normalizeText = (value = "") =>
//   String(value).replace(/\s+/g, " ").trim().toLowerCase();

// const getOrCreateParagraphProperties = (xmlDoc, pNode) => {
//   for (let child = pNode.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === "pPr"
//     ) {
//       return child;
//     }
//   }

//   const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

//   if (pNode.firstChild) {
//     pNode.insertBefore(pPr, pNode.firstChild);
//   } else {
//     pNode.appendChild(pPr);
//   }

//   return pPr;
// };

// const hasChildElement = (parent, localName) => {
//   for (let child = parent.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === localName
//     ) {
//       return true;
//     }
//   }

//   return false;
// };

// const ensureEmptyElement = (xmlDoc, parent, localName) => {
//   if (hasChildElement(parent, localName)) return;
//   const node = xmlDoc.createElementNS(WORD_NS, `w:${localName}`);
//   parent.appendChild(node);
// };

// const applyKeepNext = (xmlDoc, pNode) => {
//   const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
//   ensureEmptyElement(xmlDoc, pPr, "keepNext");
// };

// const applyKeepLines = (xmlDoc, pNode) => {
//   const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
//   ensureEmptyElement(xmlDoc, pPr, "keepLines");
// };

// const findParagraphIndexByText = (bodyChildren, targetText) => {
//   const normalizedTarget = normalizeText(targetText);

//   for (let i = 0; i < bodyChildren.length; i++) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     const text = normalizeText(getParagraphText(node));
//     if (text.includes(normalizedTarget)) {
//       return i;
//     }
//   }

//   return -1;
// };

// const findNextNonEmptyParagraphIndex = (bodyChildren, fromIndex) => {
//   for (let i = fromIndex + 1; i < bodyChildren.length; i++) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     const text = getParagraphText(node);
//     if (text) return i;
//   }

//   return -1;
// };

// const fixReportProshuPagination = (buffer, options = {}) => {
//   const { markerText = "ПРОШУ:", keepWithNextParagraph = true } = options;

//   const zip = new PizZip(buffer);
//   const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
//   const body = getBody(xmlDoc);
//   const bodyChildren = getDirectChildElements(body);

//   const proshuIndex = findParagraphIndexByText(bodyChildren, markerText);
//   if (proshuIndex === -1) {
//     return buffer;
//   }

//   const proshuParagraph = bodyChildren[proshuIndex];
//   applyKeepNext(xmlDoc, proshuParagraph);
//   applyKeepLines(xmlDoc, proshuParagraph);

//   const firstParagraphAfterIndex = findNextNonEmptyParagraphIndex(
//     bodyChildren,
//     proshuIndex,
//   );

//   if (firstParagraphAfterIndex !== -1) {
//     const firstParagraphAfter = bodyChildren[firstParagraphAfterIndex];
//     applyKeepLines(xmlDoc, firstParagraphAfter);

//     if (keepWithNextParagraph) {
//       applyKeepNext(xmlDoc, firstParagraphAfter);
//     }
//   }

//   zip.file("word/document.xml", serializeXml(xmlDoc));

//   return zip.generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });
// };

// module.exports = fixReportProshuPagination;
// const PizZip = require("pizzip");
// const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

// const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// const getFileText = (zip, name) => {
//   const file = zip.file(name);
//   if (!file) {
//     throw new Error(`DOCX does not contain ${name}`);
//   }
//   return file.asText();
// };

// const parseXml = (xml) =>
//   new DOMParser().parseFromString(xml, "application/xml");

// const serializeXml = (doc) => new XMLSerializer().serializeToString(doc);

// const normalizeText = (value = "") =>
//   String(value).replace(/\s+/g, " ").trim().toLowerCase();

// const getBody = (xmlDoc) => {
//   const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");
//   if (!bodies.length) {
//     throw new Error("Cannot find w:body in word/document.xml");
//   }
//   return bodies[0];
// };

// const getDirectChildElements = (node) => {
//   const result = [];
//   for (let child = node.firstChild; child; child = child.nextSibling) {
//     if (child.nodeType === 1) result.push(child);
//   }
//   return result;
// };

// const isParagraphNode = (node) =>
//   node &&
//   node.nodeType === 1 &&
//   node.namespaceURI === WORD_NS &&
//   node.localName === "p";

// const getParagraphText = (pNode) => {
//   let text = "";

//   const walk = (node) => {
//     for (let child = node.firstChild; child; child = child.nextSibling) {
//       if (child.nodeType !== 1) continue;

//       if (
//         child.namespaceURI === WORD_NS &&
//         child.localName === "t" &&
//         child.textContent
//       ) {
//         text += child.textContent;
//       } else {
//         walk(child);
//       }
//     }
//   };

//   walk(pNode);

//   return text.replace(/\s+/g, " ").trim();
// };

// const getOrCreateParagraphProperties = (xmlDoc, pNode) => {
//   for (let child = pNode.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === "pPr"
//     ) {
//       return child;
//     }
//   }

//   const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

//   if (pNode.firstChild) {
//     pNode.insertBefore(pPr, pNode.firstChild);
//   } else {
//     pNode.appendChild(pPr);
//   }

//   return pPr;
// };

// const hasChildElement = (parent, localName) => {
//   for (let child = parent.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === localName
//     ) {
//       return true;
//     }
//   }

//   return false;
// };

// const ensureEmptyElement = (xmlDoc, parent, localName) => {
//   if (hasChildElement(parent, localName)) return;
//   const node = xmlDoc.createElementNS(WORD_NS, `w:${localName}`);
//   parent.appendChild(node);
// };

// const removeChildElementIfExists = (parent, localName) => {
//   const toRemove = [];

//   for (let child = parent.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === localName
//     ) {
//       toRemove.push(child);
//     }
//   }

//   for (const node of toRemove) {
//     parent.removeChild(node);
//   }
// };

// const applyKeepNext = (xmlDoc, pNode) => {
//   const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
//   ensureEmptyElement(xmlDoc, pPr, "keepNext");
// };

// const applyKeepLines = (xmlDoc, pNode) => {
//   const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
//   ensureEmptyElement(xmlDoc, pPr, "keepLines");
// };

// const removeKeepLines = (pNode) => {
//   const pPr = getOrCreateParagraphProperties(pNode.ownerDocument, pNode);
//   removeChildElementIfExists(pPr, "keepLines");
// };

// const findParagraphIndexByText = (bodyChildren, targetText) => {
//   const normalizedTarget = normalizeText(targetText);

//   for (let i = 0; i < bodyChildren.length; i++) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     const text = normalizeText(getParagraphText(node));
//     if (text.includes(normalizedTarget)) {
//       return i;
//     }
//   }

//   return -1;
// };

// const findPreviousNonEmptyParagraphIndex = (bodyChildren, fromIndex) => {
//   for (let i = fromIndex - 1; i >= 0; i--) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     if (normalizeText(getParagraphText(node))) {
//       return i;
//     }
//   }

//   return -1;
// };

// const findNextNonEmptyParagraphIndex = (bodyChildren, fromIndex) => {
//   for (let i = fromIndex + 1; i < bodyChildren.length; i++) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     if (normalizeText(getParagraphText(node))) {
//       return i;
//     }
//   }

//   return -1;
// };

// const fixReportProshuPagination = (buffer, options = {}) => {
//   const {
//     markerText = "ПРОШУ:",
//     previousContextText = "На підставі вищезазначеного,",
//   } = options;

//   const zip = new PizZip(buffer);
//   const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
//   const body = getBody(xmlDoc);
//   const bodyChildren = getDirectChildElements(body);

//   const proshuIndex = findParagraphIndexByText(bodyChildren, markerText);
//   if (proshuIndex === -1) {
//     return buffer;
//   }

//   let previousIndex = findPreviousNonEmptyParagraphIndex(
//     bodyChildren,
//     proshuIndex,
//   );
//   const nextIndex = findNextNonEmptyParagraphIndex(bodyChildren, proshuIndex);

//   if (
//     previousIndex !== -1 &&
//     previousContextText &&
//     !normalizeText(getParagraphText(bodyChildren[previousIndex])).includes(
//       normalizeText(previousContextText),
//     )
//   ) {
//     const forcedContextIndex = findParagraphIndexByText(
//       bodyChildren.slice(0, proshuIndex),
//       previousContextText,
//     );

//     if (forcedContextIndex !== -1) {
//       previousIndex = forcedContextIndex;
//     }
//   }

//   if (previousIndex !== -1) {
//     const previousParagraph = bodyChildren[previousIndex];
//     applyKeepNext(xmlDoc, previousParagraph);
//     applyKeepLines(xmlDoc, previousParagraph);
//   }

//   const proshuParagraph = bodyChildren[proshuIndex];
//   applyKeepNext(xmlDoc, proshuParagraph);
//   applyKeepLines(xmlDoc, proshuParagraph);

//   if (nextIndex !== -1) {
//     const nextParagraph = bodyChildren[nextIndex];

//     applyKeepNext(xmlDoc, nextParagraph);

//     removeKeepLines(nextParagraph);
//   }

//   zip.file("word/document.xml", serializeXml(xmlDoc));

//   return zip.generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });
// };

// module.exports = fixReportProshuPagination;
// const PizZip = require("pizzip");
// const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

// const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// const getFileText = (zip, name) => {
//   const file = zip.file(name);
//   if (!file) {
//     throw new Error(`DOCX does not contain ${name}`);
//   }
//   return file.asText();
// };

// const parseXml = (xml) =>
//   new DOMParser().parseFromString(xml, "application/xml");

// const serializeXml = (doc) => new XMLSerializer().serializeToString(doc);

// const normalizeText = (value = "") =>
//   String(value).replace(/\s+/g, " ").trim().toLowerCase();

// const getBody = (xmlDoc) => {
//   const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");
//   if (!bodies.length) {
//     throw new Error("Cannot find w:body in word/document.xml");
//   }
//   return bodies[0];
// };

// const getDirectChildElements = (node) => {
//   const result = [];
//   for (let child = node.firstChild; child; child = child.nextSibling) {
//     if (child.nodeType === 1) result.push(child);
//   }
//   return result;
// };

// const isParagraphNode = (node) =>
//   node &&
//   node.nodeType === 1 &&
//   node.namespaceURI === WORD_NS &&
//   node.localName === "p";

// const getParagraphText = (pNode) => {
//   let text = "";

//   const walk = (node) => {
//     for (let child = node.firstChild; child; child = child.nextSibling) {
//       if (child.nodeType !== 1) continue;

//       if (
//         child.namespaceURI === WORD_NS &&
//         child.localName === "t" &&
//         child.textContent
//       ) {
//         text += child.textContent;
//       } else {
//         walk(child);
//       }
//     }
//   };

//   walk(pNode);

//   return text.replace(/\s+/g, " ").trim();
// };

// const getOrCreateParagraphProperties = (xmlDoc, pNode) => {
//   for (let child = pNode.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === "pPr"
//     ) {
//       return child;
//     }
//   }

//   const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

//   if (pNode.firstChild) {
//     pNode.insertBefore(pPr, pNode.firstChild);
//   } else {
//     pNode.appendChild(pPr);
//   }

//   return pPr;
// };

// const getChildElementsByLocalName = (parent, localName) => {
//   const result = [];

//   for (let child = parent.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === localName
//     ) {
//       result.push(child);
//     }
//   }

//   return result;
// };

// const removeChildElementIfExists = (parent, localName) => {
//   const toRemove = getChildElementsByLocalName(parent, localName);
//   for (const node of toRemove) {
//     parent.removeChild(node);
//   }
// };

// const removeParagraphPaginationFlags = (xmlDoc, pNode, options = {}) => {
//   if (!pNode) return false;

//   const { removeSectionProps = true } = options;
//   const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);

//   const beforeXml = pPr.toString();

//   removeChildElementIfExists(pPr, "keepNext");
//   removeChildElementIfExists(pPr, "keepLines");
//   removeChildElementIfExists(pPr, "pageBreakBefore");

//   if (removeSectionProps) {
//     removeChildElementIfExists(pPr, "sectPr");
//   }

//   return beforeXml !== pPr.toString();
// };

// const setParagraphSpacingAfter = (xmlDoc, pNode, afterTwips) => {
//   if (!pNode || afterTwips == null) return false;

//   const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
//   let spacing = null;

//   for (let child = pPr.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === "spacing"
//     ) {
//       spacing = child;
//       break;
//     }
//   }

//   if (!spacing) {
//     spacing = xmlDoc.createElementNS(WORD_NS, "w:spacing");
//     pPr.appendChild(spacing);
//   }

//   const prevValue =
//     spacing.getAttributeNS(WORD_NS, "after") || spacing.getAttribute("w:after");
//   spacing.setAttributeNS(WORD_NS, "w:after", String(afterTwips));

//   return prevValue !== String(afterTwips);
// };

// const paragraphHasOnlyBreakLikeContent = (pNode) => {
//   const text = normalizeText(getParagraphText(pNode));
//   if (text) return false;

//   let hasMeaningfulContent = false;

//   const walk = (node) => {
//     for (let child = node.firstChild; child; child = child.nextSibling) {
//       if (child.nodeType !== 1) continue;

//       if (child.namespaceURI !== WORD_NS) {
//         hasMeaningfulContent = true;
//         continue;
//       }

//       const name = child.localName;

//       if (name === "t" && normalizeText(child.textContent || "")) {
//         hasMeaningfulContent = true;
//         continue;
//       }

//       if (
//         name !== "proofErr" &&
//         name !== "bookmarkStart" &&
//         name !== "bookmarkEnd" &&
//         name !== "rPr" &&
//         name !== "pPr" &&
//         name !== "br" &&
//         name !== "lastRenderedPageBreak"
//       ) {
//         walk(child);
//       }
//     }
//   };

//   walk(pNode);

//   return !hasMeaningfulContent;
// };

// const removeParagraphNode = (node) => {
//   if (node?.parentNode) {
//     node.parentNode.removeChild(node);
//     return true;
//   }
//   return false;
// };

// const findParagraphIndexByText = (bodyChildren, targetText) => {
//   const normalizedTarget = normalizeText(targetText);

//   for (let i = 0; i < bodyChildren.length; i++) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     const text = normalizeText(getParagraphText(node));
//     if (text.includes(normalizedTarget)) {
//       return i;
//     }
//   }

//   return -1;
// };

// const findPreviousMatchingParagraphIndex = (
//   bodyChildren,
//   fromIndex,
//   targetText,
// ) => {
//   const normalizedTarget = normalizeText(targetText);

//   for (let i = fromIndex - 1; i >= 0; i--) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     const text = normalizeText(getParagraphText(node));
//     if (text.includes(normalizedTarget)) {
//       return i;
//     }
//   }

//   return -1;
// };

// const findNextNonEmptyParagraphIndex = (bodyChildren, fromIndex) => {
//   for (let i = fromIndex + 1; i < bodyChildren.length; i++) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     const text = normalizeText(getParagraphText(node));
//     if (text) {
//       return i;
//     }
//   }

//   return -1;
// };

// const cleanupIntermediateParagraphs = (
//   xmlDoc,
//   bodyChildren,
//   startIndex,
//   endIndex,
//   options = {},
// ) => {
//   const {
//     removeEmptyParagraphsBetween = true,
//     stripPaginationFlagsFromIntermediate = true,
//   } = options;

//   let removedCount = 0;
//   let cleanedCount = 0;

//   if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex + 1) {
//     return { removedCount, cleanedCount };
//   }

//   for (let i = endIndex - 1; i > startIndex; i--) {
//     const node = bodyChildren[i];
//     if (!isParagraphNode(node)) continue;

//     if (stripPaginationFlagsFromIntermediate) {
//       const changed = removeParagraphPaginationFlags(xmlDoc, node, {
//         removeSectionProps: true,
//       });
//       if (changed) cleanedCount += 1;
//     }

//     if (
//       removeEmptyParagraphsBetween &&
//       paragraphHasOnlyBreakLikeContent(node)
//     ) {
//       const removed = removeParagraphNode(node);
//       if (removed) {
//         bodyChildren.splice(i, 1);
//         removedCount += 1;
//       }
//     }
//   }

//   return { removedCount, cleanedCount };
// };

// const fixReportProshuPagination = (buffer, options = {}) => {
//   const {
//     markerText = "ПРОШУ:",
//     previousContextText = "На підставі вищезазначеного,",
//     normalizeProshuSpacingAfter = true,
//     proshuSpacingAfterTwips = 120,
//     removeEmptyParagraphsBetween = true,
//     stripPaginationFlagsFromIntermediate = true,
//   } = options;

//   const zip = new PizZip(buffer);
//   const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
//   const body = getBody(xmlDoc);
//   const bodyChildren = getDirectChildElements(body);

//   const proshuIndex = findParagraphIndexByText(bodyChildren, markerText);
//   if (proshuIndex === -1) {
//     return buffer;
//   }

//   const previousIndex = findPreviousMatchingParagraphIndex(
//     bodyChildren,
//     proshuIndex,
//     previousContextText,
//   );

//   let nextIndex = findNextNonEmptyParagraphIndex(bodyChildren, proshuIndex);

//   if (previousIndex !== -1) {
//     removeParagraphPaginationFlags(xmlDoc, bodyChildren[previousIndex], {
//       removeSectionProps: true,
//     });
//   }

//   removeParagraphPaginationFlags(xmlDoc, bodyChildren[proshuIndex], {
//     removeSectionProps: true,
//   });

//   if (normalizeProshuSpacingAfter) {
//     setParagraphSpacingAfter(
//       xmlDoc,
//       bodyChildren[proshuIndex],
//       proshuSpacingAfterTwips,
//     );
//   }

//   const cleanupResult = cleanupIntermediateParagraphs(
//     xmlDoc,
//     bodyChildren,
//     proshuIndex,
//     nextIndex,
//     {
//       removeEmptyParagraphsBetween,
//       stripPaginationFlagsFromIntermediate,
//     },
//   );

//   nextIndex = findNextNonEmptyParagraphIndex(bodyChildren, proshuIndex);

//   if (nextIndex !== -1) {
//     removeParagraphPaginationFlags(xmlDoc, bodyChildren[nextIndex], {
//       removeSectionProps: true,
//     });
//   }

//   zip.file("word/document.xml", serializeXml(xmlDoc));

//   return zip.generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });
// };

// module.exports = fixReportProshuPagination;
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
  const toRemove = getChildElementsByLocalName(parent, localName);
  for (const node of toRemove) {
    parent.removeChild(node);
  }
};

const removeParagraphPaginationFlags = (xmlDoc, pNode, options = {}) => {
  if (!pNode) return false;

  const { removeSectionProps = true } = options;
  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);

  const before = pPr.toString();

  removeChildElementIfExists(pPr, "keepNext");
  removeChildElementIfExists(pPr, "keepLines");
  removeChildElementIfExists(pPr, "pageBreakBefore");

  if (removeSectionProps) {
    removeChildElementIfExists(pPr, "sectPr");
  }

  return before !== pPr.toString();
};

const setParagraphSpacingAfter = (xmlDoc, pNode, afterTwips) => {
  if (!pNode || !Number.isFinite(afterTwips)) return false;

  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  let spacing = null;

  for (let child = pPr.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === "spacing"
    ) {
      spacing = child;
      break;
    }
  }

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
  if (node?.parentNode) {
    node.parentNode.removeChild(node);
    return true;
  }
  return false;
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

const findNextNonEmptyParagraphIndex = (bodyChildren, fromIndex) => {
  for (let i = fromIndex + 1; i < bodyChildren.length; i++) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    const text = normalizeText(getParagraphText(node));
    if (text) {
      return i;
    }
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

  let removedCount = 0;
  let cleanedCount = 0;

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex + 1) {
    return { removedCount, cleanedCount };
  }

  for (let i = endIndex - 1; i > startIndex; i--) {
    const node = bodyChildren[i];
    if (!isParagraphNode(node)) continue;

    if (stripPaginationFlagsFromIntermediate) {
      const changed = removeParagraphPaginationFlags(xmlDoc, node, {
        removeSectionProps: true,
      });
      if (changed) cleanedCount += 1;
    }

    if (
      removeEmptyParagraphsBetween &&
      paragraphHasOnlyBreakLikeContent(node)
    ) {
      const removed = removeParagraphNode(node);
      if (removed) {
        bodyChildren.splice(i, 1);
        removedCount += 1;
      }
    }
  }

  return { removedCount, cleanedCount };
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
  if (proshuIndex === -1) {
    return buffer;
  }

  const previousIndex = findPreviousMatchingParagraphIndex(
    bodyChildren,
    proshuIndex,
    previousContextText,
  );

  let nextIndex = findNextNonEmptyParagraphIndex(bodyChildren, proshuIndex);

  if (previousIndex !== -1) {
    removeParagraphPaginationFlags(xmlDoc, bodyChildren[previousIndex], {
      removeSectionProps: true,
    });
  }

  removeParagraphPaginationFlags(xmlDoc, bodyChildren[proshuIndex], {
    removeSectionProps: true,
  });

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
    removeParagraphPaginationFlags(xmlDoc, bodyChildren[nextIndex], {
      removeSectionProps: true,
    });
  }

  zip.file("word/document.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = fixReportProshuPagination;
