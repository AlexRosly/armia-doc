const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const parseXml = (xml) =>
  new DOMParser().parseFromString(xml, "application/xml");

const serializeXml = (doc) => new XMLSerializer().serializeToString(doc);

const normalizeText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim().toLowerCase();

const getXmlFileNames = (zip, prefix) =>
  Object.keys(zip.files).filter(
    (name) => name.startsWith(prefix) && name.endsWith(".xml"),
  );

const getFileText = (zip, name) => {
  const file = zip.file(name);
  if (!file) return null;
  return file.asText();
};

const isWordElement = (node, localName) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === localName;

const getHeaderRoot = (xmlDoc) => {
  const headers = xmlDoc.getElementsByTagNameNS(WORD_NS, "hdr");
  return headers.length ? headers[0] : null;
};

const getParagraphText = (pNode) => {
  let text = "";

  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (
        child.namespaceURI === WORD_NS &&
        child.localName === "t" &&
        child.textContent
      ) {
        text += child.textContent;
      } else {
        walk(child);
      }
    }
  };

  walk(pNode);
  return text.replace(/\s+/g, " ").trim();
};

const getAllParagraphs = (root) => {
  const result = [];

  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (isWordElement(child, "p")) {
        result.push(child);
      }

      walk(child);
    }
  };

  walk(root);
  return result;
};

const getOrCreateParagraphProperties = (xmlDoc, pNode) => {
  for (let child = pNode.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, "pPr")) {
      return child;
    }
  }

  const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");

  if (pNode.firstChild) {
    pNode.insertBefore(pPr, pNode.firstChild);
  } else {
    pNode.appendChild(pPr);
  }

  return pPr;
};

const removeChildElementIfExists = (parent, localName) => {
  const toRemove = [];

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) {
      toRemove.push(child);
    }
  }

  for (const node of toRemove) {
    parent.removeChild(node);
  }
};

const removeParagraphLayoutProps = (xmlDoc, pNode) => {
  if (!pNode) return false;

  const pPr = getOrCreateParagraphProperties(xmlDoc, pNode);
  const before = pPr.toString();

  removeChildElementIfExists(pPr, "keepNext");
  removeChildElementIfExists(pPr, "keepLines");
  removeChildElementIfExists(pPr, "pageBreakBefore");
  removeChildElementIfExists(pPr, "spacing");
  removeChildElementIfExists(pPr, "ind");
  removeChildElementIfExists(pPr, "textAlignment");

  return before !== pPr.toString();
};

const paragraphContainsPageField = (pNode) => {
  let found = false;

  const walk = (node) => {
    for (
      let child = node.firstChild;
      child && !found;
      child = child.nextSibling
    ) {
      if (child.nodeType !== 1) continue;

      if (child.namespaceURI === WORD_NS) {
        if (
          child.localName === "fldSimple" &&
          normalizeText(
            child.getAttribute("w:instr") || child.getAttribute("instr") || "",
          ).includes("page")
        ) {
          found = true;
          return;
        }

        if (
          child.localName === "instrText" &&
          normalizeText(child.textContent || "").includes("page")
        ) {
          found = true;
          return;
        }
      }

      walk(child);
    }
  };

  walk(pNode);
  return found;
};

const paragraphHasOnlyEmptyContent = (pNode) => {
  const text = normalizeText(getParagraphText(pNode));
  if (text) return false;

  let hasMeaningfulContent = false;

  const walk = (node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      if (child.namespaceURI !== WORD_NS) {
        hasMeaningfulContent = true;
        continue;
      }

      const name = child.localName;

      if (name === "t" && normalizeText(child.textContent || "")) {
        hasMeaningfulContent = true;
        continue;
      }

      if (
        name === "drawing" ||
        name === "object" ||
        name === "pict" ||
        name === "tbl"
      ) {
        hasMeaningfulContent = true;
        continue;
      }

      if (
        name !== "proofErr" &&
        name !== "bookmarkStart" &&
        name !== "bookmarkEnd" &&
        name !== "rPr" &&
        name !== "pPr" &&
        name !== "br" &&
        name !== "lastRenderedPageBreak" &&
        name !== "fldChar" &&
        name !== "instrText"
      ) {
        walk(child);
      }
    }
  };

  walk(pNode);

  return !hasMeaningfulContent;
};

const removeNode = (node) => {
  if (node?.parentNode) {
    node.parentNode.removeChild(node);
    return true;
  }
  return false;
};

const normalizeSingleHeaderXml = (xmlText) => {
  const xmlDoc = parseXml(xmlText);
  const headerRoot = getHeaderRoot(xmlDoc);

  if (!headerRoot) {
    return xmlText;
  }

  const paragraphs = getAllParagraphs(headerRoot);
  if (!paragraphs.length) {
    return xmlText;
  }

  const pageParagraphs = paragraphs.filter(paragraphContainsPageField);
  const pageParagraphSet = new Set(pageParagraphs);

  let changed = false;

  for (const pNode of pageParagraphs) {
    if (removeParagraphLayoutProps(xmlDoc, pNode)) {
      changed = true;
    }
  }

  const paragraphsAfterCleanup = getAllParagraphs(headerRoot);

  for (const pNode of paragraphsAfterCleanup) {
    if (pageParagraphSet.has(pNode)) {
      continue;
    }

    if (paragraphHasOnlyEmptyContent(pNode)) {
      if (removeNode(pNode)) {
        changed = true;
      }
    }
  }

  if (!changed) {
    return xmlText;
  }

  return serializeXml(xmlDoc);
};

const normalizeHeaderPageNumber = (buffer) => {
  const zip = new PizZip(buffer);
  const headerFiles = getXmlFileNames(zip, "word/header");

  if (!headerFiles.length) {
    return buffer;
  }

  let changed = false;

  for (const headerFile of headerFiles) {
    const xmlText = getFileText(zip, headerFile);
    if (!xmlText) continue;

    const normalizedXml = normalizeSingleHeaderXml(xmlText);

    if (normalizedXml !== xmlText) {
      zip.file(headerFile, normalizedXml);
      changed = true;
    }
  }

  if (!changed) {
    return buffer;
  }

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = normalizeHeaderPageNumber;
