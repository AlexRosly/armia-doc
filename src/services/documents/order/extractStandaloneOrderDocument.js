const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const isWordElement = (node, localName) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === localName;

const findDirectChild = (parent, localName) => {
  for (let child = parent?.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) return child;
  }

  return null;
};

const findLastDirectChild = (parent, localName) => {
  for (let child = parent?.lastChild; child; child = child.previousSibling) {
    if (isWordElement(child, localName)) return child;
  }

  return null;
};

const findDirectBodyChild = (body, node) => {
  let current = node;

  while (current && current.parentNode !== body) {
    current = current.parentNode;
  }

  return current?.parentNode === body ? current : null;
};

const removeDirectChildren = (parent, localName) => {
  const matches = [];

  for (let child = parent?.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) matches.push(child);
  }

  matches.forEach((node) => parent.removeChild(node));
  return matches.length;
};

const extractStandaloneOrderDocument = (mergedBuffer) => {
  if (!mergedBuffer) {
    throw new Error("extractStandaloneOrderDocument: mergedBuffer is required");
  }

  const zip = new PizZip(mergedBuffer);
  const documentFile = zip.file("word/document.xml");

  if (!documentFile) {
    throw new Error(
      "extractStandaloneOrderDocument: word/document.xml is missing",
    );
  }

  const xmlDoc = new DOMParser().parseFromString(
    documentFile.asText(),
    "application/xml",
  );
  const body = xmlDoc.getElementsByTagNameNS(WORD_NS, "body")[0];

  if (!body) {
    throw new Error("extractStandaloneOrderDocument: w:body is missing");
  }

  const sections = Array.from(
    xmlDoc.getElementsByTagNameNS(WORD_NS, "sectPr"),
  );
  const approvalSection = findLastDirectChild(body, "sectPr");

  if (
    sections.length !== 2 ||
    !approvalSection ||
    sections[1] !== approvalSection
  ) {
    throw new Error(
      `extractStandaloneOrderDocument: expected exactly two sections, got ${sections.length}`,
    );
  }

  const orderSection = sections[0];
  const sectionBreakContainer = findDirectBodyChild(body, orderSection);

  if (!sectionBreakContainer || sectionBreakContainer === approvalSection) {
    throw new Error(
      "extractStandaloneOrderDocument: order section break was not found",
    );
  }

  const standaloneOrderSection = orderSection.cloneNode(true);

  // w:type=nextPage exists only to start the approval section. A standalone
  // order has no following section, so retaining it can create a trailing page
  // in some Word versions. All geometry (margins, size, headers) is preserved.
  const removedSectionTypeCount = removeDirectChildren(
    standaloneOrderSection,
    "type",
  );

  let removedBodyNodeCount = 0;
  for (let node = sectionBreakContainer; node; ) {
    const nextNode = node.nextSibling;
    body.removeChild(node);
    removedBodyNodeCount += 1;
    node = nextNode;
  }

  body.appendChild(standaloneOrderSection);

  const remainingSections = Array.from(
    xmlDoc.getElementsByTagNameNS(WORD_NS, "sectPr"),
  );

  if (remainingSections.length !== 1) {
    throw new Error(
      `extractStandaloneOrderDocument: output must contain one section, got ${remainingSections.length}`,
    );
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
      sourceSectionCount: sections.length,
      outputSectionCount: remainingSections.length,
      removedBodyNodeCount,
      removedSectionTypeCount,
    },
  };
};

module.exports = extractStandaloneOrderDocument;
