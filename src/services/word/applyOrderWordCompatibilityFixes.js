const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DEFAULT_ORDER_BOTTOM_MARGIN_TWIPS = 1077;

const isWordElement = (node, localName) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === localName;

const findDirectChild = (parent, localName) => {
  if (!parent) return null;

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) return child;
  }

  return null;
};

const findLastDirectChild = (parent, localName) => {
  if (!parent) return null;

  for (let child = parent.lastChild; child; child = child.previousSibling) {
    if (isWordElement(child, localName)) return child;
  }

  return null;
};

const removeDirectChildren = (parent, localName) => {
  const nodes = [];

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) nodes.push(child);
  }

  nodes.forEach((node) => parent.removeChild(node));
  return nodes.length;
};

const removeAllElements = (xmlDoc, localName) => {
  const nodes = Array.from(
    xmlDoc.getElementsByTagNameNS(WORD_NS, localName),
  );

  nodes.forEach((node) => {
    if (node.parentNode) node.parentNode.removeChild(node);
  });

  return nodes.length;
};

const getWordAttribute = (node, localName) =>
  node.getAttributeNS(WORD_NS, localName) ||
  node.getAttribute(`w:${localName}`) ||
  null;

const resolveBottomMarginTwips = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ORDER_BOTTOM_MARGIN_TWIPS;
  }

  return Math.round(parsed);
};

const buildSkippedResult = (buffer, meta = {}) => ({
  buffer,
  meta: {
    enabled: true,
    applied: false,
    bottomMarginTwips: DEFAULT_ORDER_BOTTOM_MARGIN_TWIPS,
    removedDocGridCount: 0,
    removedLastRenderedPageBreakCount: 0,
    ...meta,
  },
});

const applyOrderWordCompatibilityFixes = (buffer, options = {}) => {
  const enabled = options.enabled !== false;
  const bottomMarginTwips = resolveBottomMarginTwips(
    options.bottomMarginTwips,
  );

  if (!enabled) {
    return {
      buffer,
      meta: {
        enabled: false,
        applied: false,
        reason: "disabled",
        bottomMarginTwips,
        removedDocGridCount: 0,
        removedLastRenderedPageBreakCount: 0,
      },
    };
  }

  const zip = new PizZip(buffer);
  const documentFile = zip.file("word/document.xml");

  if (!documentFile) {
    return buildSkippedResult(buffer, {
      reason: "missing-word-document",
      bottomMarginTwips,
    });
  }

  const xmlDoc = new DOMParser().parseFromString(
    documentFile.asText(),
    "application/xml",
  );
  const body = xmlDoc.getElementsByTagNameNS(WORD_NS, "body")[0];

  if (!body) {
    return buildSkippedResult(buffer, {
      reason: "missing-word-body",
      bottomMarginTwips,
    });
  }

  const sectionNodes = Array.from(
    xmlDoc.getElementsByTagNameNS(WORD_NS, "sectPr"),
  );
  const approvalSection = findLastDirectChild(body, "sectPr");
  const approvalSectionIndex = sectionNodes.indexOf(approvalSection);

  // The current order contract is exactly two sections: order + approval.
  // Refuse to guess when that invariant is absent, so approval is never touched.
  if (
    sectionNodes.length !== 2 ||
    !approvalSection ||
    approvalSectionIndex < 1 ||
    approvalSectionIndex !== sectionNodes.length - 1
  ) {
    return buildSkippedResult(buffer, {
      reason: "unexpected-section-structure",
      bottomMarginTwips,
      sectionCount: sectionNodes.length,
    });
  }

  const orderSection = sectionNodes[approvalSectionIndex - 1];
  const pageMargins = findDirectChild(orderSection, "pgMar");

  if (!pageMargins) {
    return buildSkippedResult(buffer, {
      reason: "missing-order-page-margins",
      bottomMarginTwips,
      sectionCount: sectionNodes.length,
    });
  }

  const previousBottomMarginTwips = getWordAttribute(pageMargins, "bottom");
  pageMargins.setAttribute("w:bottom", String(bottomMarginTwips));

  const removedDocGridCount = removeDirectChildren(orderSection, "docGrid");
  const removedLastRenderedPageBreakCount = removeAllElements(
    xmlDoc,
    "lastRenderedPageBreak",
  );
  const marginChanged =
    String(previousBottomMarginTwips || "") !== String(bottomMarginTwips);
  const applied =
    marginChanged ||
    removedDocGridCount > 0 ||
    removedLastRenderedPageBreakCount > 0;

  if (!applied) {
    return {
      buffer,
      meta: {
        enabled: true,
        applied: false,
        reason: "already-normalized",
        bottomMarginTwips,
        previousBottomMarginTwips,
        sectionCount: sectionNodes.length,
        orderSectionIndex: approvalSectionIndex - 1,
        approvalSectionIndex,
        removedDocGridCount,
        removedLastRenderedPageBreakCount,
      },
    };
  }

  zip.file(
    "word/document.xml",
    new XMLSerializer().serializeToString(xmlDoc),
  );

  return {
    buffer: zip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    }),
    meta: {
      enabled: true,
      applied: true,
      bottomMarginTwips,
      previousBottomMarginTwips,
      sectionCount: sectionNodes.length,
      orderSectionIndex: approvalSectionIndex - 1,
      approvalSectionIndex,
      removedDocGridCount,
      removedLastRenderedPageBreakCount,
    },
  };
};

module.exports = applyOrderWordCompatibilityFixes;
