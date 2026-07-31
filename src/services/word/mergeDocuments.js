// const PizZip = require("pizzip");

// const BODY_REGEX = /<w:body[^>]*>([\s\S]*?)<\/w:body>/;
// const PAGE_BREAK_XML = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

// const getDocumentXml = (zip) => {
//   const file = zip.file("word/document.xml");

//   if (!file) {
//     throw new Error("DOCX does not contain word/document.xml");
//   }

//   return file.asText();
// };

// const extractBody = (xml) => {
//   const match = xml.match(BODY_REGEX);

//   if (!match) {
//     throw new Error("Cannot find <w:body> in word/document.xml");
//   }

//   return match[1];
// };

// const removeSectionProperties = (body) => {
//   return body
//     .replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, "")
//     .replace(/<w:sectPr[^>]*\/>/g, "");
// };

// const extractSectionProperties = (body) => {
//   const fullMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
//   if (fullMatch) return fullMatch[0];

//   const selfClosingMatch = body.match(/<w:sectPr[^>]*\/>/);
//   return selfClosingMatch ? selfClosingMatch[0] : "";
// };

// const mergeDocuments = (buffers, options = {}) => {
//   const { insertPageBreak = true } = options;

//   if (!Array.isArray(buffers) || buffers.length < 2) {
//     throw new Error("mergeDocuments requires at least 2 DOCX buffers");
//   }

//   const baseZip = new PizZip(buffers[0]);
//   const baseXml = getDocumentXml(baseZip);
//   const baseBody = extractBody(baseXml);
//   const finalSectPr = extractSectionProperties(baseBody);

//   let mergedBody = removeSectionProperties(baseBody);

//   for (let i = 1; i < buffers.length; i++) {
//     const zip = new PizZip(buffers[i]);
//     const xml = getDocumentXml(zip);
//     const body = removeSectionProperties(extractBody(xml));

//     if (insertPageBreak) {
//       mergedBody += PAGE_BREAK_XML;
//     }

//     mergedBody += body;
//   }

//   mergedBody += finalSectPr;

//   const mergedXml = baseXml.replace(
//     BODY_REGEX,
//     `<w:body>${mergedBody}</w:body>`,
//   );

//   baseZip.file("word/document.xml", mergedXml);

//   return baseZip.generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });
// };

// module.exports = mergeDocuments;
const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const getDocumentXml = (zip) => {
  const file = zip.file("word/document.xml");

  if (!file) {
    throw new Error("DOCX does not contain word/document.xml");
  }

  return file.asText();
};

const parseXml = (xml) => {
  return new DOMParser().parseFromString(xml, "application/xml");
};

const serializeXml = (doc) => {
  return new XMLSerializer().serializeToString(doc);
};

const getBody = (xmlDoc) => {
  const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");

  if (!bodies || !bodies.length) {
    throw new Error("Cannot find w:body in word/document.xml");
  }

  return bodies[0];
};

const getDirectChildElements = (node) => {
  const result = [];

  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) {
      result.push(child);
    }
  }

  return result;
};

const isSectPrNode = (node) => {
  return (
    node &&
    node.nodeType === 1 &&
    node.namespaceURI === WORD_NS &&
    node.localName === "sectPr"
  );
};

const getLastBodySectPr = (body) => {
  const children = getDirectChildElements(body);
  const last = children[children.length - 1];

  if (!isSectPrNode(last)) {
    throw new Error("Document body does not end with w:sectPr");
  }

  return last;
};

const removeSectPrReferences = (sectPr) => {
  const toRemove = [];

  for (let child = sectPr.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      (child.localName === "headerReference" ||
        child.localName === "footerReference")
    ) {
      toRemove.push(child);
    }
  }

  for (const node of toRemove) {
    sectPr.removeChild(node);
  }

  return sectPr;
};

const ensureNextPageType = (xmlDoc, sectPr) => {
  let typeNode = null;

  for (let child = sectPr.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === "type"
    ) {
      typeNode = child;
      break;
    }
  }

  if (!typeNode) {
    typeNode = xmlDoc.createElementNS(WORD_NS, "w:type");
    typeNode.setAttribute("w:val", "nextPage");

    if (sectPr.firstChild) {
      sectPr.insertBefore(typeNode, sectPr.firstChild);
    } else {
      sectPr.appendChild(typeNode);
    }

    return sectPr;
  }

  typeNode.setAttribute("w:val", "nextPage");
  return sectPr;
};

const normalizeSectPrForInsertedSection = (xmlDoc, sectPr) => {
  const clone = sectPr.cloneNode(true);
  removeSectPrReferences(clone);
  ensureNextPageType(xmlDoc, clone);
  return clone;
};

const normalizeSectPrForFinalSection = (sectPr) => {
  const clone = sectPr.cloneNode(true);
  removeSectPrReferences(clone);
  return clone;
};

const createSectionBreakParagraph = (xmlDoc, sectPrNode) => {
  const p = xmlDoc.createElementNS(WORD_NS, "w:p");
  const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

  const normalizedSectPr = normalizeSectPrForInsertedSection(
    xmlDoc,
    sectPrNode,
  );

  pPr.appendChild(normalizedSectPr);
  p.appendChild(pPr);

  return p;
};

const appendImportedChildren = (targetBody, sourceBody) => {
  const children = getDirectChildElements(sourceBody);

  for (const child of children) {
    if (isSectPrNode(child)) {
      continue;
    }

    targetBody.appendChild(child.cloneNode(true));
  }
};

const mergeDocuments = (buffers) => {
  if (!Array.isArray(buffers) || buffers.length < 2) {
    throw new Error("mergeDocuments requires at least 2 DOCX buffers");
  }

  const baseZip = new PizZip(buffers[0]);
  const baseXml = getDocumentXml(baseZip);
  const baseDoc = parseXml(baseXml);
  const baseBody = getBody(baseDoc);

  const baseFinalSectPr = getLastBodySectPr(baseBody);
  baseBody.removeChild(baseFinalSectPr);

  let currentSectPr = baseFinalSectPr.cloneNode(true);

  for (let i = 1; i < buffers.length; i++) {
    const nextZip = new PizZip(buffers[i]);
    const nextXml = getDocumentXml(nextZip);
    const nextDoc = parseXml(nextXml);
    const nextBody = getBody(nextDoc);
    const nextFinalSectPr = getLastBodySectPr(nextBody);

    baseBody.appendChild(createSectionBreakParagraph(baseDoc, currentSectPr));
    appendImportedChildren(baseBody, nextBody);

    currentSectPr = nextFinalSectPr.cloneNode(true);
  }

  baseBody.appendChild(normalizeSectPrForFinalSection(currentSectPr));

  const mergedXml = serializeXml(baseDoc);
  baseZip.file("word/document.xml", mergedXml);

  return baseZip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = mergeDocuments;
