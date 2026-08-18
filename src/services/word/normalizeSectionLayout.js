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

const normalizeSectionLayout = (buffer, options = {}) => {
  const { removeDocGrid = true } = options;

  const zip = new PizZip(buffer);
  const xmlDoc = parseXml(getFileText(zip, "word/document.xml"));
  const sectPrNodes = xmlDoc.getElementsByTagNameNS(WORD_NS, "sectPr");

  let changed = false;

  for (let i = 0; i < sectPrNodes.length; i++) {
    const sectPr = sectPrNodes[i];

    if (removeDocGrid) {
      const removed = removeDirectChildrenByLocalName(sectPr, "docGrid");
      if (removed > 0) {
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

module.exports = normalizeSectionLayout;
