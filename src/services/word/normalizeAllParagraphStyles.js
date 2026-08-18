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

const getFirstChildByLocalName = (parent, localName) => {
  if (!parent) return null;

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) {
      return child;
    }
  }

  return null;
};

const getOrCreateChild = (xmlDoc, parent, localName) => {
  let node = getFirstChildByLocalName(parent, localName);
  if (node) return node;

  node = xmlDoc.createElementNS(WORD_NS, `w:${localName}`);
  parent.appendChild(node);
  return node;
};

const removeDirectChildrenByLocalNames = (parent, localNames) => {
  let removed = false;

  for (let child = parent.firstChild; child; ) {
    const next = child.nextSibling;

    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      localNames.includes(child.localName)
    ) {
      parent.removeChild(child);
      removed = true;
    }

    child = next;
  }

  return removed;
};

const getAttr = (node, localName) => {
  if (!node) return null;
  return (
    node.getAttribute(`w:${localName}`) || node.getAttribute(localName) || null
  );
};

const normalizeText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim().toLowerCase();

const normalizeAllParagraphStyles = (buffer, options = {}) => {
  const {
    setBeforeTwips = 0,
    setAfterTwips = 0,
    setLineTwips = 240,
    setLineRule = "auto",
    removeKeepNext = true,
    removeKeepLines = true,
    removeWidowControl = true,
    removePageBreakBefore = true,
    removeSnapToGrid = true,
    removeContextualSpacing = true,
    skipStyleIds = ["ae", "af0"],
    skipStyleNames = ["header", "footer", "title", "subtitle"],
  } = options;

  const zip = new PizZip(buffer);
  const stylesXml = getFileText(zip, "word/styles.xml");
  const xmlDoc = parseXml(stylesXml);

  const styleNodes = Array.from(
    xmlDoc.getElementsByTagNameNS(WORD_NS, "style"),
  );

  let changed = false;

  const normalizedSkipStyleIds = new Set(
    skipStyleIds.map((value) => String(value).trim()),
  );

  const normalizedSkipStyleNames = new Set(
    skipStyleNames.map((value) => normalizeText(value)),
  );

  for (const styleNode of styleNodes) {
    const styleType = getAttr(styleNode, "type");
    if (styleType !== "paragraph") {
      continue;
    }

    const styleId = getAttr(styleNode, "styleId");
    const nameNode = getFirstChildByLocalName(styleNode, "name");
    const styleName = normalizeText(getAttr(nameNode, "val"));

    if (
      normalizedSkipStyleIds.has(String(styleId || "").trim()) ||
      normalizedSkipStyleNames.has(styleName)
    ) {
      continue;
    }

    const pPr = getOrCreateChild(xmlDoc, styleNode, "pPr");
    const spacing = getOrCreateChild(xmlDoc, pPr, "spacing");

    const beforeValue = String(setBeforeTwips);
    const afterValue = String(setAfterTwips);
    const lineValue = String(setLineTwips);

    if (spacing.getAttribute("w:before") !== beforeValue) {
      spacing.setAttribute("w:before", beforeValue);
      changed = true;
    }

    if (spacing.getAttribute("w:after") !== afterValue) {
      spacing.setAttribute("w:after", afterValue);
      changed = true;
    }

    if (spacing.getAttribute("w:line") !== lineValue) {
      spacing.setAttribute("w:line", lineValue);
      changed = true;
    }

    if (spacing.getAttribute("w:lineRule") !== setLineRule) {
      spacing.setAttribute("w:lineRule", setLineRule);
      changed = true;
    }

    const nodesToRemove = [];
    if (removeKeepNext) nodesToRemove.push("keepNext");
    if (removeKeepLines) nodesToRemove.push("keepLines");
    if (removeWidowControl) nodesToRemove.push("widowControl");
    if (removePageBreakBefore) nodesToRemove.push("pageBreakBefore");
    if (removeSnapToGrid) nodesToRemove.push("snapToGrid");
    if (removeContextualSpacing) nodesToRemove.push("contextualSpacing");

    if (nodesToRemove.length > 0) {
      if (removeDirectChildrenByLocalNames(pPr, nodesToRemove)) {
        changed = true;
      }
    }
  }

  if (!changed) {
    return buffer;
  }

  zip.file("word/styles.xml", serializeXml(xmlDoc));

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = normalizeAllParagraphStyles;
