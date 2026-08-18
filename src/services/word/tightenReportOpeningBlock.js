const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const parseXml = (xml) =>
  new DOMParser().parseFromString(xml, "application/xml");

const serializeXml = (doc) => new XMLSerializer().serializeToString(doc);

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

const getDirectChild = (parent, localName) => {
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) {
      return child;
    }
  }
  return null;
};

const removeDirectChildrenByLocalName = (parent, localName) => {
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

const getParagraphText = (paragraph) => {
  const texts = paragraph.getElementsByTagNameNS(WORD_NS, "t");
  let result = "";

  for (let i = 0; i < texts.length; i++) {
    result += texts[i].textContent || "";
  }

  return result
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const hasDrawingOrObject = (paragraph) => {
  return (
    paragraph.getElementsByTagNameNS(WORD_NS, "drawing").length > 0 ||
    paragraph.getElementsByTagNameNS(WORD_NS, "object").length > 0 ||
    paragraph.getElementsByTagNameNS(WORD_NS, "pict").length > 0
  );
};

const hasPageBreak = (paragraph) => {
  const brNodes = paragraph.getElementsByTagNameNS(WORD_NS, "br");

  for (let i = 0; i < brNodes.length; i++) {
    const type =
      brNodes[i].getAttribute("w:type") ||
      brNodes[i].getAttributeNS(WORD_NS, "type");

    if (type === "page") {
      return true;
    }
  }

  const lastRenderedPageBreaks = paragraph.getElementsByTagNameNS(
    WORD_NS,
    "lastRenderedPageBreak",
  );

  return lastRenderedPageBreaks.length > 0;
};

const isWhitespaceParagraph = (paragraph) => {
  if (hasDrawingOrObject(paragraph)) return false;
  if (hasPageBreak(paragraph)) return false;

  return getParagraphText(paragraph) === "";
};

const isLikelyGarbageParagraph = (paragraph) => {
  if (hasDrawingOrObject(paragraph)) return false;
  if (hasPageBreak(paragraph)) return false;

  const text = getParagraphText(paragraph);

  if (!text) return true;

  if (/^[·.•▪■\-–—_]+$/.test(text)) {
    return true;
  }

  return false;
};

const ensureParagraphPr = (doc, paragraph) => {
  let pPr = getDirectChild(paragraph, "pPr");
  if (pPr) return pPr;

  pPr = doc.createElementNS(WORD_NS, "w:pPr");

  if (paragraph.firstChild) {
    paragraph.insertBefore(pPr, paragraph.firstChild);
  } else {
    paragraph.appendChild(pPr);
  }

  return pPr;
};

const ensureSpacingNode = (doc, pPr) => {
  let spacing = getDirectChild(pPr, "spacing");
  if (spacing) return spacing;

  spacing = doc.createElementNS(WORD_NS, "w:spacing");
  pPr.appendChild(spacing);
  return spacing;
};

const setParagraphSpacing = (
  doc,
  paragraph,
  {
    beforeTwips = 0,
    afterTwips = 0,
    lineTwips = null,
    lineRule = "auto",
    removeKeepNext = true,
    removeKeepLines = true,
    removePageBreakBefore = true,
    removeWidowControl = true,
    removeContextualSpacing = true,
    removeSnapToGrid = true,
  } = {},
) => {
  const pPr = ensureParagraphPr(doc, paragraph);
  const spacing = ensureSpacingNode(doc, pPr);

  spacing.setAttribute("w:before", String(beforeTwips));
  spacing.setAttribute("w:after", String(afterTwips));

  if (Number.isFinite(lineTwips)) {
    spacing.setAttribute("w:line", String(lineTwips));
    spacing.setAttribute("w:lineRule", lineRule);
  }

  if (removeKeepNext) {
    removeDirectChildrenByLocalName(pPr, "keepNext");
  }

  if (removeKeepLines) {
    removeDirectChildrenByLocalName(pPr, "keepLines");
  }

  if (removePageBreakBefore) {
    removeDirectChildrenByLocalName(pPr, "pageBreakBefore");
  }

  if (removeWidowControl) {
    removeDirectChildrenByLocalName(pPr, "widowControl");
  }

  if (removeContextualSpacing) {
    removeDirectChildrenByLocalName(pPr, "contextualSpacing");
  }

  if (removeSnapToGrid) {
    removeDirectChildrenByLocalName(pPr, "snapToGrid");
  }
};

const tightenReportOpeningBlock = (buffer, options = {}) => {
  const {
    proshuText = "ПРОШУ:",
    foundationText = "На підставі вищезазначеного,",
    documentTitleText = "РАПОРТ",
    signatureMarkerText = "__SIGNATURE_START__",
    openingParagraphLimit = 80,
    compactBeforeTwips = 0,
    compactAfterTwips = 0,
    compactLineTwips = 240,
    foundationSpacingAfterTwips = null,
    proshuSpacingAfterTwips = null,
  } = options;

  const zip = new PizZip(buffer);
  const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));

  const body = xmlDoc.getElementsByTagNameNS(WORD_NS, "body")[0];
  if (!body) {
    return buffer;
  }

  const paragraphs = [];
  for (let child = body.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, "p")) {
      paragraphs.push(child);
    }
  }

  if (!paragraphs.length) {
    return buffer;
  }

  let proshuIndex = -1;
  let signatureIndex = -1;
  let foundationIndex = -1;

  for (let i = 0; i < paragraphs.length; i++) {
    const text = getParagraphText(paragraphs[i]);

    if (foundationIndex === -1 && text.includes(foundationText)) {
      foundationIndex = i;
    }

    if (proshuIndex === -1 && text === proshuText) {
      proshuIndex = i;
    }

    if (signatureIndex === -1 && text.includes(signatureMarkerText)) {
      signatureIndex = i;
    }
  }

  const openingEndIndex =
    proshuIndex !== -1
      ? proshuIndex
      : Math.min(paragraphs.length - 1, openingParagraphLimit - 1);

  let changed = false;

  for (let i = 0; i <= openingEndIndex && i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const text = getParagraphText(paragraph);

    if (text === documentTitleText) {
      continue;
    }

    if (text === proshuText) {
      setParagraphSpacing(xmlDoc, paragraph, {
        beforeTwips: 0,
        afterTwips: Number.isFinite(proshuSpacingAfterTwips)
          ? proshuSpacingAfterTwips
          : compactAfterTwips,
        lineTwips: compactLineTwips,
        lineRule: "auto",
        removeKeepNext: true,
        removeKeepLines: true,
        removePageBreakBefore: true,
        removeWidowControl: true,
        removeContextualSpacing: true,
        removeSnapToGrid: true,
      });
      changed = true;
      continue;
    }

    if (text.includes(foundationText)) {
      setParagraphSpacing(xmlDoc, paragraph, {
        beforeTwips: 0,
        afterTwips: Number.isFinite(foundationSpacingAfterTwips)
          ? foundationSpacingAfterTwips
          : compactAfterTwips,
        lineTwips: compactLineTwips,
        lineRule: "auto",
        removeKeepNext: true,
        removeKeepLines: true,
        removePageBreakBefore: true,
        removeWidowControl: true,
        removeContextualSpacing: true,
        removeSnapToGrid: true,
      });
      changed = true;
      continue;
    }

    setParagraphSpacing(xmlDoc, paragraph, {
      beforeTwips: compactBeforeTwips,
      afterTwips: compactAfterTwips,
      lineTwips: compactLineTwips,
      lineRule: "auto",
      removeKeepNext: true,
      removeKeepLines: true,
      removePageBreakBefore: true,
      removeWidowControl: true,
      removeContextualSpacing: true,
      removeSnapToGrid: true,
    });

    changed = true;
  }

  if (
    foundationIndex !== -1 &&
    proshuIndex !== -1 &&
    foundationIndex < proshuIndex
  ) {
    for (let i = proshuIndex - 1; i > foundationIndex; i--) {
      const paragraph = paragraphs[i];

      if (
        isWhitespaceParagraph(paragraph) ||
        isLikelyGarbageParagraph(paragraph)
      ) {
        body.removeChild(paragraph);
        changed = true;
      }
    }
  }

  if (proshuIndex !== -1) {
    for (
      let i = proshuIndex + 1;
      i < paragraphs.length && i < proshuIndex + 4;
      i++
    ) {
      const paragraph = paragraphs[i];

      if (
        isWhitespaceParagraph(paragraph) ||
        isLikelyGarbageParagraph(paragraph)
      ) {
        body.removeChild(paragraph);
        changed = true;
      } else {
        break;
      }
    }
  }

  if (signatureIndex !== -1) {
    for (let i = signatureIndex - 1; i >= 0; i--) {
      const paragraph = paragraphs[i];

      if (
        isWhitespaceParagraph(paragraph) ||
        isLikelyGarbageParagraph(paragraph)
      ) {
        body.removeChild(paragraph);
        changed = true;
        continue;
      }

      break;
    }
  }

  for (let i = 0; i < Math.min(paragraphs.length, 8); i++) {
    const paragraph = paragraphs[i];

    if (
      isWhitespaceParagraph(paragraph) ||
      isLikelyGarbageParagraph(paragraph)
    ) {
      body.removeChild(paragraph);
      changed = true;
      continue;
    }

    break;
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

module.exports = tightenReportOpeningBlock;
