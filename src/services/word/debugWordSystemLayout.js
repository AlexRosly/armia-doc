const fs = require("fs");
const PizZip = require("pizzip");
const { DOMParser } = require("@xmldom/xmldom");

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const parseXml = (xml) =>
  new DOMParser().parseFromString(xml, "application/xml");

const isWordElement = (node, localName) =>
  node &&
  node.nodeType === 1 &&
  node.namespaceURI === WORD_NS &&
  node.localName === localName;

const getFileText = (zip, name) => {
  const file = zip.file(name);
  return file ? file.asText() : null;
};

const getFirstChildByLocalName = (parent, localName) => {
  if (!parent) return null;

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isWordElement(child, localName)) {
      return child;
    }
  }

  return null;
};

const getAttr = (node, localName) => {
  if (!node) return null;
  return (
    node.getAttribute(`w:${localName}`) || node.getAttribute(localName) || null
  );
};

const normalizeText = (value = "") => String(value).replace(/\s+/g, " ").trim();

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
  return normalizeText(text);
};

const inspectSections = (documentXml) => {
  if (!documentXml) return { exists: false };

  const doc = parseXml(documentXml);
  const sectPrNodes = Array.from(doc.getElementsByTagNameNS(WORD_NS, "sectPr"));

  return {
    exists: true,
    count: sectPrNodes.length,
    sections: sectPrNodes.map((sectPr, index) => {
      const pgSz = getFirstChildByLocalName(sectPr, "pgSz");
      const pgMar = getFirstChildByLocalName(sectPr, "pgMar");
      const docGrid = getFirstChildByLocalName(sectPr, "docGrid");
      const typeNode = getFirstChildByLocalName(sectPr, "type");

      return {
        index,
        type: getAttr(typeNode, "val"),
        page: {
          w: getAttr(pgSz, "w"),
          h: getAttr(pgSz, "h"),
          orient: getAttr(pgSz, "orient"),
        },
        margins: {
          top: getAttr(pgMar, "top"),
          right: getAttr(pgMar, "right"),
          bottom: getAttr(pgMar, "bottom"),
          left: getAttr(pgMar, "left"),
          header: getAttr(pgMar, "header"),
          footer: getAttr(pgMar, "footer"),
          gutter: getAttr(pgMar, "gutter"),
        },
        docGrid: {
          type: getAttr(docGrid, "type"),
          linePitch: getAttr(docGrid, "linePitch"),
          charSpace: getAttr(docGrid, "charSpace"),
        },
      };
    }),
  };
};

const inspectSettings = (settingsXml) => {
  if (!settingsXml) return { exists: false };

  const doc = parseXml(settingsXml);
  const compat = Array.from(doc.getElementsByTagNameNS(WORD_NS, "compat"))[0];
  const defaultTabStop = Array.from(
    doc.getElementsByTagNameNS(WORD_NS, "defaultTabStop"),
  )[0];

  const compatDetails = [];

  if (compat) {
    for (let child = compat.firstChild; child; child = child.nextSibling) {
      if (child.nodeType !== 1) continue;

      compatDetails.push({
        name: child.localName,
        uri: child.namespaceURI,
        val: getAttr(child, "val"),
        nameAttr: getAttr(child, "name"),
      });
    }
  }

  return {
    exists: true,
    defaultTabStop: getAttr(defaultTabStop, "val"),
    compat: compatDetails,
  };
};

const inspectStyles = (stylesXml) => {
  if (!stylesXml) return { exists: false };

  const doc = parseXml(stylesXml);

  const docDefaults = Array.from(
    doc.getElementsByTagNameNS(WORD_NS, "docDefaults"),
  )[0];
  let defaultParagraph = null;
  let defaultRun = null;

  if (docDefaults) {
    const pPrDefault = Array.from(
      docDefaults.getElementsByTagNameNS(WORD_NS, "pPrDefault"),
    )[0];
    const rPrDefault = Array.from(
      docDefaults.getElementsByTagNameNS(WORD_NS, "rPrDefault"),
    )[0];

    if (pPrDefault) {
      const pPr = getFirstChildByLocalName(pPrDefault, "pPr");
      const spacing = pPr ? getFirstChildByLocalName(pPr, "spacing") : null;

      defaultParagraph = {
        before: getAttr(spacing, "before"),
        after: getAttr(spacing, "after"),
        line: getAttr(spacing, "line"),
        lineRule: getAttr(spacing, "lineRule"),
      };
    }

    if (rPrDefault) {
      const rPr = getFirstChildByLocalName(rPrDefault, "rPr");
      const rFonts = rPr ? getFirstChildByLocalName(rPr, "rFonts") : null;
      const sz = rPr ? getFirstChildByLocalName(rPr, "sz") : null;
      const szCs = rPr ? getFirstChildByLocalName(rPr, "szCs") : null;

      defaultRun = {
        ascii: getAttr(rFonts, "ascii"),
        hAnsi: getAttr(rFonts, "hAnsi"),
        eastAsia: getAttr(rFonts, "eastAsia"),
        cs: getAttr(rFonts, "cs"),
        sz: getAttr(sz, "val"),
        szCs: getAttr(szCs, "val"),
      };
    }
  }

  return {
    exists: true,
    defaultParagraph,
    defaultRun,
  };
};

const inspectDocumentFontsAndStyles = (documentXml) => {
  if (!documentXml) return { exists: false };

  const doc = parseXml(documentXml);
  const paragraphs = Array.from(doc.getElementsByTagNameNS(WORD_NS, "p"));

  const paragraphStyleUsage = {};
  const runFontsUsage = {};
  const runSizeUsage = {};
  let lastRenderedPageBreakCount = 0;
  let brCount = 0;
  let tabCount = 0;

  const sampleParagraphs = [];

  paragraphs.forEach((pNode, index) => {
    const pPr = getFirstChildByLocalName(pNode, "pPr");
    const pStyle = pPr ? getFirstChildByLocalName(pPr, "pStyle") : null;
    const styleId = getAttr(pStyle, "val") || "(none)";
    paragraphStyleUsage[styleId] = (paragraphStyleUsage[styleId] || 0) + 1;

    const runs = [];
    let runCount = 0;

    for (let child = pNode.firstChild; child; child = child.nextSibling) {
      if (!isWordElement(child, "r")) continue;
      runCount += 1;

      const rPr = getFirstChildByLocalName(child, "rPr");
      const rFonts = rPr ? getFirstChildByLocalName(rPr, "rFonts") : null;
      const sz = rPr ? getFirstChildByLocalName(rPr, "sz") : null;

      const fontKey = JSON.stringify({
        ascii: getAttr(rFonts, "ascii"),
        hAnsi: getAttr(rFonts, "hAnsi"),
        eastAsia: getAttr(rFonts, "eastAsia"),
        cs: getAttr(rFonts, "cs"),
      });

      const sizeKey = getAttr(sz, "val") || "(none)";

      runFontsUsage[fontKey] = (runFontsUsage[fontKey] || 0) + 1;
      runSizeUsage[sizeKey] = (runSizeUsage[sizeKey] || 0) + 1;

      runs.push({
        font: JSON.parse(fontKey),
        size: sizeKey,
      });

      if (
        Array.from(
          child.getElementsByTagNameNS(WORD_NS, "lastRenderedPageBreak"),
        ).length > 0
      ) {
        lastRenderedPageBreakCount += 1;
      }
      if (Array.from(child.getElementsByTagNameNS(WORD_NS, "br")).length > 0) {
        brCount += 1;
      }
      if (Array.from(child.getElementsByTagNameNS(WORD_NS, "tab")).length > 0) {
        tabCount += 1;
      }
    }

    if (sampleParagraphs.length < 20) {
      sampleParagraphs.push({
        index,
        styleId,
        runCount,
        text: getParagraphText(pNode).slice(0, 200),
        runs: runs.slice(0, 5),
      });
    }
  });

  return {
    exists: true,
    paragraphCount: paragraphs.length,
    paragraphStyleUsage,
    runFontsUsage,
    runSizeUsage,
    lastRenderedPageBreakCount,
    brCount,
    tabCount,
    sampleParagraphs,
  };
};

const debugWordSystemLayout = (bufferOrPath) => {
  const buffer = Buffer.isBuffer(bufferOrPath)
    ? bufferOrPath
    : fs.readFileSync(bufferOrPath);

  const zip = new PizZip(buffer);

  const documentXml = getFileText(zip, "word/document.xml");
  const stylesXml = getFileText(zip, "word/styles.xml");
  const settingsXml = getFileText(zip, "word/settings.xml");

  const report = {
    sections: inspectSections(documentXml),
    settings: inspectSettings(settingsXml),
    styles: inspectStyles(stylesXml),
    document: inspectDocumentFontsAndStyles(documentXml),
  };

  console.log(JSON.stringify(report, null, 2));
  return report;
};

module.exports = debugWordSystemLayout;
