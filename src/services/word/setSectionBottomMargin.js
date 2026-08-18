const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const findDirectChild = (parent, localName) => {
  if (!parent) return null;

  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (
      node.nodeType === 1 &&
      node.namespaceURI === WORD_NS &&
      node.localName === localName
    ) {
      return node;
    }
  }

  return null;
};

const setWAttr = (node, name, value) => {
  node.setAttribute(`w:${name}`, String(value));
};

const setSectionBottomMargin = (buffer, bottomTwips = 1077) => {
  const zip = new PizZip(buffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) return buffer;

  const xml = docFile.asText();
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  const sectPrNodes = Array.from(doc.getElementsByTagNameNS(WORD_NS, "sectPr"));

  if (!sectPrNodes.length) {
    return buffer;
  }

  sectPrNodes.forEach((sectPr) => {
    let pgMar = findDirectChild(sectPr, "pgMar");

    if (!pgMar) {
      pgMar = doc.createElementNS(WORD_NS, "w:pgMar");
      sectPr.appendChild(pgMar);
    }

    setWAttr(pgMar, "bottom", bottomTwips);
  });

  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  return zip.generate({ type: "nodebuffer" });
};

module.exports = setSectionBottomMargin;
