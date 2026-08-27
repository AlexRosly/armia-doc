const fs = require("fs/promises");

const WORD_DOCUMENT_PATH = "word/document.xml";
const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const ACT_DOCX_GEOMETRY = Object.freeze({
  ACT_LANDSCAPE_V1: Object.freeze({
    page: Object.freeze({
      widthTwips: 16838,
      heightTwips: 11906,
      orientation: "landscape",
    }),
    margins: Object.freeze({
      top: 567,
      right: 567,
      bottom: 567,
      left: 1417,
    }),
  }),
  ACT_LANDSCAPE_V2: Object.freeze({
    page: Object.freeze({
      widthTwips: 16838,
      heightTwips: 11906,
      orientation: "landscape",
    }),
    margins: Object.freeze({
      top: 1701,
      right: 567,
      bottom: 567,
      left: 567,
    }),
  }),
});

const getDirectChild = (parent, localName) => {
  if (!parent) return null;

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (
      child.nodeType === 1 &&
      child.namespaceURI === WORD_NS &&
      child.localName === localName
    ) {
      return child;
    }
  }

  return null;
};

const getWordAttribute = (node, localName) => {
  if (!node) return null;
  return (
    node.getAttributeNS(WORD_NS, localName) ||
    node.getAttribute(`w:${localName}`) ||
    node.getAttribute(localName) ||
    null
  );
};

const readSectionGeometry = async (docxPath) => {
  // Dependencies are loaded only for the real DOCX inspection. This keeps the
  // pure comparison helper independently unit-testable.
  const PizZip = require("pizzip");
  const { DOMParser } = require("@xmldom/xmldom");
  const zip = new PizZip(await fs.readFile(docxPath));
  const documentXml = zip.file(WORD_DOCUMENT_PATH)?.asText();

  if (!documentXml) {
    throw new Error(
      `validateActDocxGeometry: missing file ${WORD_DOCUMENT_PATH}`,
    );
  }

  const document = new DOMParser().parseFromString(
    documentXml,
    "application/xml",
  );
  const sectionNodes = Array.from(
    document.getElementsByTagNameNS(WORD_NS, "sectPr"),
  );

  return sectionNodes.map((section, index) => {
    const pageSize = getDirectChild(section, "pgSz");
    const margins = getDirectChild(section, "pgMar");

    return {
      index,
      page: {
        widthTwips: getWordAttribute(pageSize, "w"),
        heightTwips: getWordAttribute(pageSize, "h"),
        orientation: getWordAttribute(pageSize, "orient"),
      },
      margins: {
        top: getWordAttribute(margins, "top"),
        right: getWordAttribute(margins, "right"),
        bottom: getWordAttribute(margins, "bottom"),
        left: getWordAttribute(margins, "left"),
      },
    };
  });
};

const mismatch = (actual, expected) => String(actual) !== String(expected);

const compareSectionGeometry = (sections, layoutProfile) => {
  const expected = ACT_DOCX_GEOMETRY[layoutProfile];

  if (!expected) {
    throw new Error(`Unknown act layoutProfile: ${layoutProfile}`);
  }

  if (!sections.length) {
    return [
      {
        code: "ACT_DOCX_SECTION_MISSING",
        message: "У DOCX Акта відсутні параметри секції",
      },
    ];
  }

  const violations = [];

  for (const section of sections) {
    for (const field of ["widthTwips", "heightTwips"]) {
      if (mismatch(section.page?.[field], expected.page[field])) {
        violations.push({
          code: "ACT_DOCX_PAGE_SIZE_MISMATCH",
          message: "Розмір сторінки DOCX Акта не відповідає шаблону",
          sectionIndex: section.index,
          field,
          expected: expected.page[field],
          actual: section.page?.[field] ?? null,
        });
      }
    }

    if (
      mismatch(section.page?.orientation, expected.page.orientation)
    ) {
      violations.push({
        code: "ACT_DOCX_ORIENTATION_MISMATCH",
        message: "Орієнтація DOCX Акта не відповідає шаблону",
        sectionIndex: section.index,
        expected: expected.page.orientation,
        actual: section.page?.orientation ?? null,
      });
    }

    for (const side of ["top", "right", "bottom", "left"]) {
      if (mismatch(section.margins?.[side], expected.margins[side])) {
        violations.push({
          code: "ACT_DOCX_MARGIN_MISMATCH",
          message: `Поле ${side} у DOCX Акта не відповідає шаблону`,
          sectionIndex: section.index,
          side,
          expectedTwips: expected.margins[side],
          actualTwips: section.margins?.[side] ?? null,
        });
      }
    }
  }

  return violations;
};

const validateActDocxGeometry = async (docxPath, layoutProfile) => {
  const sections = await readSectionGeometry(docxPath);
  const hardViolations = compareSectionGeometry(sections, layoutProfile);

  return {
    passed: hardViolations.length === 0,
    layoutProfile,
    expected: ACT_DOCX_GEOMETRY[layoutProfile],
    sections,
    hardViolations,
  };
};

module.exports = validateActDocxGeometry;
module.exports.ACT_DOCX_GEOMETRY = ACT_DOCX_GEOMETRY;
module.exports.compareSectionGeometry = compareSectionGeometry;
