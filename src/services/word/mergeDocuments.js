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
// const PizZip = require("pizzip");
// const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

// const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
// const REL_NS =
//   "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// const getDocumentXml = (zip) => {
//   const file = zip.file("word/document.xml");

//   if (!file) {
//     throw new Error("DOCX does not contain word/document.xml");
//   }

//   return file.asText();
// };

// const parseXml = (xml) => {
//   return new DOMParser().parseFromString(xml, "application/xml");
// };

// const serializeXml = (doc) => {
//   return new XMLSerializer().serializeToString(doc);
// };

// const getBody = (xmlDoc) => {
//   const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");

//   if (!bodies || !bodies.length) {
//     throw new Error("Cannot find w:body in word/document.xml");
//   }

//   return bodies[0];
// };

// const getDirectChildElements = (node) => {
//   const result = [];

//   for (let child = node.firstChild; child; child = child.nextSibling) {
//     if (child.nodeType === 1) {
//       result.push(child);
//     }
//   }

//   return result;
// };

// const isSectPrNode = (node) => {
//   return (
//     node &&
//     node.nodeType === 1 &&
//     node.namespaceURI === WORD_NS &&
//     node.localName === "sectPr"
//   );
// };

// const getLastBodySectPr = (body) => {
//   const children = getDirectChildElements(body);
//   const last = children[children.length - 1];

//   if (!isSectPrNode(last)) {
//     throw new Error("Document body does not end with w:sectPr");
//   }

//   return last;
// };

// const removeSectPrReferences = (sectPr) => {
//   const toRemove = [];

//   for (let child = sectPr.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       (child.localName === "headerReference" ||
//         child.localName === "footerReference")
//     ) {
//       toRemove.push(child);
//     }
//   }

//   for (const node of toRemove) {
//     sectPr.removeChild(node);
//   }

//   return sectPr;
// };

// const ensureNextPageType = (xmlDoc, sectPr) => {
//   let typeNode = null;

//   for (let child = sectPr.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === "type"
//     ) {
//       typeNode = child;
//       break;
//     }
//   }

//   if (!typeNode) {
//     typeNode = xmlDoc.createElementNS(WORD_NS, "w:type");
//     typeNode.setAttribute("w:val", "nextPage");

//     if (sectPr.firstChild) {
//       sectPr.insertBefore(typeNode, sectPr.firstChild);
//     } else {
//       sectPr.appendChild(typeNode);
//     }

//     return sectPr;
//   }

//   typeNode.setAttribute("w:val", "nextPage");
//   return sectPr;
// };

// const normalizeSectPrForInsertedSection = (xmlDoc, sectPr) => {
//   const clone = sectPr.cloneNode(true);
//   removeSectPrReferences(clone);
//   ensureNextPageType(xmlDoc, clone);
//   return clone;
// };

// // const normalizeSectPrForFinalSection = (sectPr) => {
// //   const clone = sectPr.cloneNode(true);
// //   removeSectPrReferences(clone);
// //   return clone;
// // };

// const normalizeSectPrForFinalSection = (sectPr) => {
//   return sectPr.cloneNode(true);
// };

// const createSectionBreakParagraph = (xmlDoc, sectPrNode) => {
//   const p = xmlDoc.createElementNS(WORD_NS, "w:p");
//   const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

//   const normalizedSectPr = normalizeSectPrForInsertedSection(
//     xmlDoc,
//     sectPrNode,
//   );

//   pPr.appendChild(normalizedSectPr);
//   p.appendChild(pPr);

//   return p;
// };

// const appendImportedChildren = (targetBody, sourceBody) => {
//   const children = getDirectChildElements(sourceBody);

//   for (const child of children) {
//     if (isSectPrNode(child)) {
//       continue;
//     }

//     targetBody.appendChild(child.cloneNode(true));
//   }
// };

// const mergeDocuments = (buffers) => {
//   if (!Array.isArray(buffers) || buffers.length < 2) {
//     throw new Error("mergeDocuments requires at least 2 DOCX buffers");
//   }

//   const baseZip = new PizZip(buffers[0]);
//   const baseXml = getDocumentXml(baseZip);
//   const baseDoc = parseXml(baseXml);
//   const baseBody = getBody(baseDoc);

//   const baseFinalSectPr = getLastBodySectPr(baseBody);
//   baseBody.removeChild(baseFinalSectPr);

//   let currentSectPr = baseFinalSectPr.cloneNode(true);

//   for (let i = 1; i < buffers.length; i++) {
//     const nextZip = new PizZip(buffers[i]);
//     const nextXml = getDocumentXml(nextZip);
//     const nextDoc = parseXml(nextXml);
//     const nextBody = getBody(nextDoc);
//     const nextFinalSectPr = getLastBodySectPr(nextBody);

//     baseBody.appendChild(createSectionBreakParagraph(baseDoc, currentSectPr));
//     appendImportedChildren(baseBody, nextBody);

//     currentSectPr = nextFinalSectPr.cloneNode(true);
//   }

//   baseBody.appendChild(normalizeSectPrForFinalSection(currentSectPr));

//   const mergedXml = serializeXml(baseDoc);
//   baseZip.file("word/document.xml", mergedXml);

//   return baseZip.generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });
// };

// module.exports = mergeDocuments;
// const PizZip = require("pizzip");
// const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

// const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// const getDocumentXml = (zip) => {
//   const file = zip.file("word/document.xml");

//   if (!file) {
//     throw new Error("DOCX does not contain word/document.xml");
//   }

//   return file.asText();
// };

// const parseXml = (xml) => {
//   return new DOMParser().parseFromString(xml, "application/xml");
// };

// const serializeXml = (doc) => {
//   return new XMLSerializer().serializeToString(doc);
// };

// const getBody = (xmlDoc) => {
//   const bodies = xmlDoc.getElementsByTagNameNS(WORD_NS, "body");

//   if (!bodies || !bodies.length) {
//     throw new Error("Cannot find w:body in word/document.xml");
//   }

//   return bodies[0];
// };

// const getDirectChildElements = (node) => {
//   const result = [];

//   for (let child = node.firstChild; child; child = child.nextSibling) {
//     if (child.nodeType === 1) {
//       result.push(child);
//     }
//   }

//   return result;
// };

// const isSectPrNode = (node) => {
//   return (
//     node &&
//     node.nodeType === 1 &&
//     node.namespaceURI === WORD_NS &&
//     node.localName === "sectPr"
//   );
// };

// const getLastBodySectPr = (body) => {
//   const children = getDirectChildElements(body);
//   const last = children[children.length - 1];

//   if (!isSectPrNode(last)) {
//     throw new Error("Document body does not end with w:sectPr");
//   }

//   return last;
// };

// const removeSectPrReferences = (sectPr) => {
//   const toRemove = [];

//   for (let child = sectPr.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       (child.localName === "headerReference" ||
//         child.localName === "footerReference")
//     ) {
//       toRemove.push(child);
//     }
//   }

//   for (const node of toRemove) {
//     sectPr.removeChild(node);
//   }

//   return sectPr;
// };

// const ensureNextPageType = (xmlDoc, sectPr) => {
//   let typeNode = null;

//   for (let child = sectPr.firstChild; child; child = child.nextSibling) {
//     if (
//       child.nodeType === 1 &&
//       child.namespaceURI === WORD_NS &&
//       child.localName === "type"
//     ) {
//       typeNode = child;
//       break;
//     }
//   }

//   if (!typeNode) {
//     typeNode = xmlDoc.createElementNS(WORD_NS, "w:type");
//     typeNode.setAttribute("w:val", "nextPage");

//     if (sectPr.firstChild) {
//       sectPr.insertBefore(typeNode, sectPr.firstChild);
//     } else {
//       sectPr.appendChild(typeNode);
//     }

//     return sectPr;
//   }

//   typeNode.setAttribute("w:val", "nextPage");
//   return sectPr;
// };

// const normalizeSectPrForInsertedSection = (xmlDoc, sectPr) => {
//   const clone = sectPr.cloneNode(true);
//   removeSectPrReferences(clone);
//   ensureNextPageType(xmlDoc, clone);
//   return clone;
// };

// const normalizeSectPrForFinalSection = (sectPr) => {
//   return sectPr.cloneNode(true);
// };

// const createSectionBreakParagraph = (xmlDoc, sectPrNode) => {
//   const p = xmlDoc.createElementNS(WORD_NS, "w:p");
//   const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

//   const normalizedSectPr = normalizeSectPrForInsertedSection(
//     xmlDoc,
//     sectPrNode,
//   );

//   pPr.appendChild(normalizedSectPr);
//   p.appendChild(pPr);

//   return p;
// };

// const appendImportedChildren = (targetBody, sourceBody) => {
//   const children = getDirectChildElements(sourceBody);

//   for (const child of children) {
//     if (isSectPrNode(child)) {
//       continue;
//     }

//     targetBody.appendChild(child.cloneNode(true));
//   }
// };

// const mergeDocuments = (buffers) => {
//   if (!Array.isArray(buffers) || buffers.length < 2) {
//     throw new Error("mergeDocuments requires at least 2 DOCX buffers");
//   }

//   const baseZip = new PizZip(buffers[0]);
//   const baseXml = getDocumentXml(baseZip);
//   const baseDoc = parseXml(baseXml);
//   const baseBody = getBody(baseDoc);

//   const baseFinalSectPr = getLastBodySectPr(baseBody);
//   const baseFinalSectPrClone = baseFinalSectPr.cloneNode(true);

//   // Удаляем финальную секцию из base body, потом вернём её в самый конец
//   baseBody.removeChild(baseFinalSectPr);

//   // Для промежуточных section break'ов можно использовать текущую секцию,
//   // но финальная секция всегда должна остаться от base document.
//   let currentSectPrForBreak = baseFinalSectPrClone.cloneNode(true);

//   for (let i = 1; i < buffers.length; i++) {
//     const nextZip = new PizZip(buffers[i]);
//     const nextXml = getDocumentXml(nextZip);
//     const nextDoc = parseXml(nextXml);
//     const nextBody = getBody(nextDoc);
//     const nextFinalSectPr = getLastBodySectPr(nextBody);

//     // Вставляем разрыв секции/страницы перед следующим документом
//     baseBody.appendChild(
//       createSectionBreakParagraph(baseDoc, currentSectPrForBreak),
//     );

//     // Добавляем весь контент следующего документа, кроме его финального sectPr
//     appendImportedChildren(baseBody, nextBody);

//     // Для следующего промежуточного разрыва можно использовать секцию
//     // только что добавленного документа, но без header/footer refs.
//     currentSectPrForBreak = nextFinalSectPr.cloneNode(true);
//   }

//   // КРИТИЧНО:
//   // финальная секция должна быть от base document,
//   // потому что только для неё в baseZip гарантированно есть валидные
//   // header/footer references, rels и сами parts.
//   baseBody.appendChild(normalizeSectPrForFinalSection(baseFinalSectPrClone));

//   const mergedXml = serializeXml(baseDoc);
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
const PKG_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

const DOC_REL_TYPE_HEADER =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
const DOC_REL_TYPE_FOOTER =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";

const CONTENT_TYPE_HEADER =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml";
const CONTENT_TYPE_FOOTER =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml";

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

const isSectPrNode = (node) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === "sectPr";

const getLastBodySectPr = (body) => {
  const children = getDirectChildElements(body);
  const last = children[children.length - 1];

  if (!isSectPrNode(last)) {
    throw new Error("Document body does not end with w:sectPr");
  }

  return last;
};

const appendImportedChildren = (targetBody, sourceBody) => {
  const children = getDirectChildElements(sourceBody);

  for (const child of children) {
    if (isSectPrNode(child)) continue;
    targetBody.appendChild(child.cloneNode(true));
  }
};

const removeHeaderFooterRefs = (sectPr) => {
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

const ensureType = (xmlDoc, sectPr, val) => {
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
    if (sectPr.firstChild) {
      sectPr.insertBefore(typeNode, sectPr.firstChild);
    } else {
      sectPr.appendChild(typeNode);
    }
  }

  typeNode.setAttribute("w:val", val);
  return sectPr;
};

const createSectionBreakParagraph = (xmlDoc, sectPrNode) => {
  const p = xmlDoc.createElementNS(WORD_NS, "w:p");
  const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");
  pPr.appendChild(sectPrNode);
  p.appendChild(pPr);
  return p;
};

const getRelationshipsRoot = (relsDoc) => {
  const root = relsDoc.documentElement;
  if (!root || root.localName !== "Relationships") {
    throw new Error("Invalid word/_rels/document.xml.rels");
  }
  return root;
};

const getNextRelId = (relsRoot) => {
  let max = 0;

  for (let child = relsRoot.firstChild; child; child = child.nextSibling) {
    if (child.nodeType !== 1 || child.localName !== "Relationship") continue;
    const id = child.getAttribute("Id");
    const match = /^rId(\d+)$/.exec(id || "");
    if (match) max = Math.max(max, Number(match[1]));
  }

  return `rId${max + 1}`;
};

const getNextPartFileName = (zip, kind) => {
  const re =
    kind === "header" ? /^word\/header(\d+)\.xml$/ : /^word\/footer(\d+)\.xml$/;

  let max = 0;

  for (const name of Object.keys(zip.files)) {
    const match = re.exec(name);
    if (match) max = Math.max(max, Number(match[1]));
  }

  return `${kind}${max + 1}.xml`;
};

const createEmptyHeaderXml = () =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:hdr xmlns:w="${WORD_NS}"/>`;

const createEmptyFooterXml = () =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:ftr xmlns:w="${WORD_NS}"/>`;

const ensureContentTypeOverride = (zip, partName, contentType) => {
  const contentTypesXml = getFileText(zip, "[Content_Types].xml");
  const doc = parseXml(contentTypesXml);
  const root = doc.documentElement;

  let exists = false;

  for (let child = root.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.localName === "Override" &&
      child.getAttribute("PartName") === partName
    ) {
      exists = true;
      break;
    }
  }

  if (!exists) {
    const node = doc.createElement("Override");
    node.setAttribute("PartName", partName);
    node.setAttribute("ContentType", contentType);
    root.appendChild(node);
    zip.file("[Content_Types].xml", serializeXml(doc));
  }
};

const addRelationship = (relsDoc, relsRoot, type, target) => {
  const relId = getNextRelId(relsRoot);
  const relNode = relsDoc.createElementNS(PKG_REL_NS, "Relationship");
  relNode.setAttribute("Id", relId);
  relNode.setAttribute("Type", type);
  relNode.setAttribute("Target", target);
  relsRoot.appendChild(relNode);
  return relId;
};

const addEmptyPart = (baseZip, kind) => {
  const relsDoc = parseXml(
    getFileText(baseZip, "word/_rels/document.xml.rels"),
  );
  const relsRoot = getRelationshipsRoot(relsDoc);

  const fileName = getNextPartFileName(baseZip, kind);
  const relId = addRelationship(
    relsDoc,
    relsRoot,
    kind === "header" ? DOC_REL_TYPE_HEADER : DOC_REL_TYPE_FOOTER,
    fileName,
  );

  baseZip.file("word/_rels/document.xml.rels", serializeXml(relsDoc));
  baseZip.file(
    `word/${fileName}`,
    kind === "header" ? createEmptyHeaderXml() : createEmptyFooterXml(),
  );

  ensureContentTypeOverride(
    baseZip,
    `/word/${fileName}`,
    kind === "header" ? CONTENT_TYPE_HEADER : CONTENT_TYPE_FOOTER,
  );

  return relId;
};

const prependRef = (xmlDoc, sectPr, tagName, type, relId) => {
  const node = xmlDoc.createElementNS(WORD_NS, `w:${tagName}`);
  node.setAttribute("w:type", type);
  node.setAttribute("r:id", relId);

  if (sectPr.firstChild) {
    sectPr.insertBefore(node, sectPr.firstChild);
  } else {
    sectPr.appendChild(node);
  }

  return sectPr;
};

const hasTitlePg = (sectPr) => {
  for (let child = sectPr.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === "titlePg"
    ) {
      return true;
    }
  }
  return false;
};

const hasEvenAndOddHeadersSetting = (settingsDoc) => {
  const settings = settingsDoc.documentElement;
  if (!settings) return false;

  for (let child = settings.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === "evenAndOddHeaders"
    ) {
      return true;
    }
  }

  return false;
};

const applyBlankRefsToSectPr = ({
  xmlDoc,
  sectPr,
  emptyHeaderRelId,
  emptyFooterRelId,
  includeFirst,
  includeEven,
}) => {
  removeHeaderFooterRefs(sectPr);

  if (includeFirst) {
    prependRef(xmlDoc, sectPr, "footerReference", "first", emptyFooterRelId);
    prependRef(xmlDoc, sectPr, "headerReference", "first", emptyHeaderRelId);
  }

  if (includeEven) {
    prependRef(xmlDoc, sectPr, "footerReference", "even", emptyFooterRelId);
    prependRef(xmlDoc, sectPr, "headerReference", "even", emptyHeaderRelId);
  }

  prependRef(xmlDoc, sectPr, "footerReference", "default", emptyFooterRelId);
  prependRef(xmlDoc, sectPr, "headerReference", "default", emptyHeaderRelId);

  return sectPr;
};

const mergeDocuments = (buffers) => {
  if (!Array.isArray(buffers) || buffers.length < 2) {
    throw new Error("mergeDocuments requires at least 2 DOCX buffers");
  }

  const baseZip = new PizZip(buffers[0]);
  const baseDoc = parseXml(getFileText(baseZip, "word/document.xml"));
  const baseBody = getBody(baseDoc);

  const settingsDoc = parseXml(getFileText(baseZip, "word/settings.xml"));

  const baseFinalSectPr = getLastBodySectPr(baseBody).cloneNode(true);
  const baseHasTitlePg = hasTitlePg(baseFinalSectPr);
  const evenAndOddHeaders = hasEvenAndOddHeadersSetting(settingsDoc);

  // Удаляем финальный sectPr base, потом вернём его как section break
  baseBody.removeChild(getLastBodySectPr(baseBody));

  const emptyHeaderRelId = addEmptyPart(baseZip, "header");
  const emptyFooterRelId = addEmptyPart(baseZip, "footer");

  let finalSectPr = null;

  for (let i = 1; i < buffers.length; i++) {
    const nextZip = new PizZip(buffers[i]);
    const nextDoc = parseXml(getFileText(nextZip, "word/document.xml"));
    const nextBody = getBody(nextDoc);
    const nextFinalSectPr = getLastBodySectPr(nextBody).cloneNode(true);

    // ВАЖНО:
    // paragraph sectPr перед approval должен описывать ПРЕДЫДУЩУЮ секцию,
    // то есть секцию приказа
    const breakSectPr = baseFinalSectPr.cloneNode(true);
    ensureType(baseDoc, breakSectPr, "nextPage");

    baseBody.appendChild(createSectionBreakParagraph(baseDoc, breakSectPr));
    appendImportedChildren(baseBody, nextBody);

    // А финальный body/sectPr должен описывать УЖЕ approval section
    finalSectPr = nextFinalSectPr.cloneNode(true);
    applyBlankRefsToSectPr({
      xmlDoc: baseDoc,
      sectPr: finalSectPr,
      emptyHeaderRelId,
      emptyFooterRelId,
      includeFirst: baseHasTitlePg,
      includeEven: evenAndOddHeaders,
    });
  }

  if (!finalSectPr) {
    throw new Error("Unable to build final section properties");
  }

  baseBody.appendChild(finalSectPr);

  baseZip.file("word/document.xml", serializeXml(baseDoc));

  return baseZip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = mergeDocuments;
