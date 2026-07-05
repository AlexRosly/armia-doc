// const PizZip = require("pizzip");

// const BODY_REGEX = /<w:body[^>]*>([\s\S]*?)<\/w:body>/;

// const extractBody = (xml) => {
//   const match = xml.match(BODY_REGEX);

//   if (!match) {
//     throw new Error("Cannot find <w:body>");
//   }

//   return match[1];
// };

// const removeSectionProperties = (body) => {
//   return body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, "");
// };

// const extractSectionProperties = (body) => {
//   const match = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);

//   return match ? match[0] : "";
// };

// const mergeDocuments = (buffers) => {
//   if (!Array.isArray(buffers)) {
//     throw new Error("buffers must be array");
//   }

//   if (buffers.length < 2) {
//     throw new Error("Need at least 2 documents");
//   }

//   const baseZip = new PizZip(buffers[0]);

//   const baseXml = baseZip.file("word/document.xml").asText();

//   const baseBody = extractBody(baseXml);

//   const finalSectPr = extractSectionProperties(baseBody);

//   let mergedBody = removeSectionProperties(baseBody);

//   for (let i = 1; i < buffers.length; i++) {
//     const zip = new PizZip(buffers[i]);

//     const xml = zip.file("word/document.xml").asText();

//     let body = extractBody(xml);

//     body = removeSectionProperties(body);

//     mergedBody += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

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
//   if (fullMatch) {
//     return fullMatch[0];
//   }

//   const selfClosingMatch = body.match(/<w:sectPr[^>]*\/>/);
//   return selfClosingMatch ? selfClosingMatch[0] : "";
// };

/**
 * Simple DOCX merger for controlled internal templates.
 *
 * Limitations:
 * - does not merge images/media
 * - does not merge headers/footers
 * - does not merge numbering/styles/rels
 * - intended only for simple compatible DOCX files
 */
// const mergeDocuments = (buffers) => {
//   if (!Array.isArray(buffers)) {
//     throw new Error("buffers must be an array");
//   }

//   if (buffers.length < 2) {
//     throw new Error("Need at least 2 documents to merge");
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

//     mergedBody += PAGE_BREAK_XML;
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

// const mergeDocuments = (buffers) => {
//   if (!Array.isArray(buffers)) {
//     throw new Error("buffers must be an array");
//   }

//   if (buffers.length < 2) {
//     throw new Error("Need at least 2 documents to merge");
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

//     mergedBody += PAGE_BREAK_XML;
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

// const mergeDocuments = (buffers) => {
//   if (!Array.isArray(buffers)) {
//     throw new Error("buffers must be an array");
//   }

//   if (buffers.length < 2) {
//     throw new Error("Need at least 2 documents to merge");
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

//     mergedBody += PAGE_BREAK_XML;
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

const BODY_REGEX = /<w:body[^>]*>([\s\S]*?)<\/w:body>/;
const PAGE_BREAK_XML = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

const getDocumentXml = (zip) => {
  const file = zip.file("word/document.xml");

  if (!file) {
    throw new Error("DOCX does not contain word/document.xml");
  }

  return file.asText();
};

const extractBody = (xml) => {
  const match = xml.match(BODY_REGEX);

  if (!match) {
    throw new Error("Cannot find <w:body> in word/document.xml");
  }

  return match[1];
};

const removeSectionProperties = (body) => {
  return body
    .replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, "")
    .replace(/<w:sectPr[^>]*\/>/g, "");
};

const extractSectionProperties = (body) => {
  const fullMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  if (fullMatch) return fullMatch[0];

  const selfClosingMatch = body.match(/<w:sectPr[^>]*\/>/);
  return selfClosingMatch ? selfClosingMatch[0] : "";
};

const mergeDocuments = (buffers) => {
  if (!Array.isArray(buffers)) {
    throw new Error("buffers must be an array");
  }

  if (buffers.length < 2) {
    throw new Error("Need at least 2 documents to merge");
  }

  const baseZip = new PizZip(buffers[0]);
  const baseXml = getDocumentXml(baseZip);
  const baseBody = extractBody(baseXml);

  const finalSectPr = extractSectionProperties(baseBody);
  let mergedBody = removeSectionProperties(baseBody);

  for (let i = 1; i < buffers.length; i++) {
    const zip = new PizZip(buffers[i]);
    const xml = getDocumentXml(zip);
    const body = removeSectionProperties(extractBody(xml));

    mergedBody += PAGE_BREAK_XML;
    mergedBody += body;
  }

  mergedBody += finalSectPr;

  const mergedXml = baseXml.replace(
    BODY_REGEX,
    `<w:body>${mergedBody}</w:body>`,
  );

  baseZip.file("word/document.xml", mergedXml);
  console.log(
    "[mergeDocuments] buffer sizes:",
    buffers.map((buffer) => buffer.length),
  );

  return baseZip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = mergeDocuments;
