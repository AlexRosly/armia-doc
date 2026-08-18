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

const normalizeStylesDefaultParagraph = (buffer, options = {}) => {
  const {
    setBeforeTwips = 0,
    setAfterTwips = 0,
    setLineTwips = 240,
    setLineRule = "auto",
    removeKeepNext = true,
    removeKeepLines = true,
    removeWidowControl = true,
    removeSnapToGrid = true,
    removeContextualSpacing = true,
  } = options;

  const zip = new PizZip(buffer);
  const stylesXml = getFileText(zip, "word/styles.xml");
  const xmlDoc = parseXml(stylesXml);

  const docDefaults = xmlDoc.getElementsByTagNameNS(WORD_NS, "docDefaults")[0];
  if (!docDefaults) {
    return buffer;
  }

  const pPrDefault = getOrCreateChild(xmlDoc, docDefaults, "pPrDefault");
  const pPr = getOrCreateChild(xmlDoc, pPrDefault, "pPr");
  const spacing = getOrCreateChild(xmlDoc, pPr, "spacing");

  let changed = false;

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
  if (removeSnapToGrid) nodesToRemove.push("snapToGrid");
  if (removeContextualSpacing) nodesToRemove.push("contextualSpacing");

  if (nodesToRemove.length > 0) {
    if (removeDirectChildrenByLocalNames(pPr, nodesToRemove)) {
      changed = true;
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

module.exports = normalizeStylesDefaultParagraph;
