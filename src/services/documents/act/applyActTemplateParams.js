const fs = require("fs/promises");
const PizZip = require("pizzip");

const ptToHalfPoints = (pt) => Math.round(pt * 2);
const ptToTwips = (pt) => Math.round(pt * 20);
const lineSpacingToTwips = (value) => Math.round(value * 240);
const cmToTwips = (cm) => Math.round(cm * 567);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getXmlFile = (zip, filePath) => {
  const file = zip.file(filePath);

  if (!file) {
    throw new Error(`DOCX does not contain ${filePath}`);
  }

  return file.asText();
};

const setXmlFile = (zip, filePath, xml) => {
  zip.file(filePath, xml);
};

const replaceOrAppendTag = (xml, singleTagRegex, newTag) => {
  if (singleTagRegex.test(xml)) {
    return xml.replace(singleTagRegex, newTag);
  }

  return xml + newTag;
};

const updateStyleBlock = (stylesXml, styleId, updater) => {
  const styleRegex = new RegExp(
    `(<w:style\\b[^>]*w:styleId="${escapeRegExp(styleId)}"[^>]*>[\\s\\S]*?<\\/w:style>)`,
    "g",
  );

  if (!styleRegex.test(stylesXml)) {
    console.warn(`[applyActTemplateParams] style not found: ${styleId}`);
    return stylesXml;
  }

  return stylesXml.replace(styleRegex, (styleBlock) => updater(styleBlock));
};

const ensurePPr = (styleBlock, mutator) => {
  const pPrRegex = /<w:pPr>([\s\S]*?)<\/w:pPr>/;

  if (pPrRegex.test(styleBlock)) {
    return styleBlock.replace(pPrRegex, (_, inner) => {
      const updatedInner = mutator(inner);
      return `<w:pPr>${updatedInner}</w:pPr>`;
    });
  }

  const updatedInner = mutator("");

  return styleBlock.replace(
    /(<w:style\b[^>]*>)/,
    `$1<w:pPr>${updatedInner}</w:pPr>`,
  );
};

const ensureRPr = (styleBlock, mutator) => {
  const rPrRegex = /<w:rPr>([\s\S]*?)<\/w:rPr>/;

  if (rPrRegex.test(styleBlock)) {
    return styleBlock.replace(rPrRegex, (_, inner) => {
      const updatedInner = mutator(inner);
      return `<w:rPr>${updatedInner}</w:rPr>`;
    });
  }

  const updatedInner = mutator("");

  return styleBlock.replace(
    /(<w:style\b[^>]*>)/,
    `$1<w:rPr>${updatedInner}</w:rPr>`,
  );
};

const setSpacing = (pPrInner, { before, line, lineRule = "auto" }) => {
  const spacingRegex = /<w:spacing\b[^>]*\/>/;

  let spacingTag = "<w:spacing";

  if (before != null) {
    spacingTag += ` w:before="${before}"`;
  }

  if (line != null) {
    spacingTag += ` w:line="${line}" w:lineRule="${lineRule}"`;
  }

  spacingTag += "/>";

  if (spacingRegex.test(pPrInner)) {
    return pPrInner.replace(spacingRegex, spacingTag);
  }

  return spacingTag + pPrInner;
};

const setKeepNext = (pPrInner, enabled) => {
  if (!enabled) return pPrInner;
  if (/<w:keepNext\/>/.test(pPrInner)) return pPrInner;
  return `<w:keepNext/>${pPrInner}`;
};

const setKeepLines = (pPrInner, enabled) => {
  if (!enabled) return pPrInner;
  if (/<w:keepLines\/>/.test(pPrInner)) return pPrInner;
  return `<w:keepLines/>${pPrInner}`;
};

const setFontSize = (rPrInner, halfPoints) => {
  let updated = rPrInner;

  updated = replaceOrAppendTag(
    updated,
    /<w:sz\b[^>]*\/>/,
    `<w:sz w:val="${halfPoints}"/>`,
  );

  updated = replaceOrAppendTag(
    updated,
    /<w:szCs\b[^>]*\/>/,
    `<w:szCs w:val="${halfPoints}"/>`,
  );

  return updated;
};

const applyMarginsToDocument = (documentXml, margins) => {
  const { topCm, leftCm, rightCm, bottomCm } = margins;

  const top = cmToTwips(topCm);
  const left = cmToTwips(leftCm);
  const right = cmToTwips(rightCm);
  const bottom = cmToTwips(bottomCm);

  const pgMarRegex = /<w:pgMar\b[^>]*\/>/;

  if (!pgMarRegex.test(documentXml)) {
    console.warn("[applyActTemplateParams] <w:pgMar/> not found");
    return documentXml;
  }

  return documentXml.replace(pgMarRegex, (tag) => {
    let updated = tag;

    updated = /w:top="[^"]*"/.test(updated)
      ? updated.replace(/w:top="[^"]*"/, `w:top="${top}"`)
      : updated.replace("/>", ` w:top="${top}"/>`);

    updated = /w:left="[^"]*"/.test(updated)
      ? updated.replace(/w:left="[^"]*"/, `w:left="${left}"`)
      : updated.replace("/>", ` w:left="${left}"/>`);

    updated = /w:right="[^"]*"/.test(updated)
      ? updated.replace(/w:right="[^"]*"/, `w:right="${right}"`)
      : updated.replace("/>", ` w:right="${right}"/>`);

    updated = /w:bottom="[^"]*"/.test(updated)
      ? updated.replace(/w:bottom="[^"]*"/, `w:bottom="${bottom}"`)
      : updated.replace("/>", ` w:bottom="${bottom}"/>`);

    return updated;
  });
};

const applyActTemplateParamsToFile = async (docxPath, profile) => {
  const buffer = await fs.readFile(docxPath);
  const zip = new PizZip(buffer);

  let stylesXml = getXmlFile(zip, "word/styles.xml");
  let documentXml = getXmlFile(zip, "word/document.xml");

  if (profile.margins) {
    documentXml = applyMarginsToDocument(documentXml, profile.margins);
  }

  stylesXml = updateStyleBlock(stylesXml, "ActApprovalArea", (styleBlock) => {
    let updated = ensurePPr(styleBlock, (pPrInner) =>
      setSpacing(pPrInner, {
        line: lineSpacingToTwips(profile.approvalAreaLineSpacing),
        lineRule: "auto",
      }),
    );

    updated = ensureRPr(updated, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
    );

    return updated;
  });

  stylesXml = updateStyleBlock(stylesXml, "ActDocumentTitle", (styleBlock) => {
    let updated = ensurePPr(styleBlock, (pPrInner) =>
      setSpacing(pPrInner, {
        before: ptToTwips(profile.documentTitleSpacingBeforePt),
      }),
    );

    updated = ensureRPr(updated, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
    );

    return updated;
  });

  stylesXml = updateStyleBlock(stylesXml, "ActMainText", (styleBlock) => {
    let updated = ensurePPr(styleBlock, (pPrInner) =>
      setSpacing(pPrInner, {
        line: lineSpacingToTwips(profile.mainLineSpacing),
        lineRule: "auto",
      }),
    );

    updated = ensureRPr(updated, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
    );

    return updated;
  });

  stylesXml = updateStyleBlock(stylesXml, "ActSectionHeading", (styleBlock) => {
    let updated = ensurePPr(styleBlock, (pPrInner) => {
      let next = setSpacing(pPrInner, {
        before: ptToTwips(profile.verticalSpacingBeforePt),
      });

      next = setKeepNext(next, Boolean(profile.headingsKeepWithNext));
      return next;
    });

    updated = ensureRPr(updated, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
    );

    return updated;
  });

  stylesXml = updateStyleBlock(stylesXml, "ActSignatureBlock", (styleBlock) => {
    let updated = ensurePPr(styleBlock, (pPrInner) => {
      let next = setSpacing(pPrInner, {
        line: lineSpacingToTwips(profile.mainLineSpacing),
        lineRule: "auto",
      });

      next = setKeepLines(next, Boolean(profile.signatureBlockKeepTogether));
      return next;
    });

    updated = ensureRPr(updated, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.signatureBlockPt)),
    );

    return updated;
  });

  stylesXml = updateStyleBlock(stylesXml, "ActSignatureHint", (styleBlock) =>
    ensureRPr(styleBlock, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.signatureHintPt)),
    ),
  );

  stylesXml = updateStyleBlock(stylesXml, "ActTableText", (styleBlock) => {
    let updated = ensurePPr(styleBlock, (pPrInner) =>
      setSpacing(pPrInner, {
        line: lineSpacingToTwips(profile.tableLineSpacing),
        lineRule: "auto",
      }),
    );

    updated = ensureRPr(updated, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.tableTextPt)),
    );

    return updated;
  });

  stylesXml = updateStyleBlock(stylesXml, "ActStaticHeader", (styleBlock) =>
    ensureRPr(styleBlock, (rPrInner) =>
      setFontSize(rPrInner, ptToHalfPoints(profile.staticHeaderPt)),
    ),
  );

  zip.file("word/styles.xml", stylesXml);
  zip.file("word/document.xml", documentXml);

  const finalBuffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  await fs.writeFile(docxPath, finalBuffer);
};

module.exports = applyActTemplateParamsToFile;
// const PizZip = require("pizzip");

// const getXmlFile = (zip, filePath) => {
//   const file = zip.file(filePath);

//   if (!file) {
//     throw new Error(`DOCX does not contain ${filePath}`);
//   }

//   return file.asText();
// };

// const setXmlFile = (zip, filePath, xml) => {
//   zip.file(filePath, xml);
// };

// const ptToHalfPoints = (pt) => Math.round(pt * 2);
// const ptToTwips = (pt) => Math.round(pt * 20);
// const lineSpacingToTwips = (value) => Math.round(value * 240);
// const cmToTwips = (cm) => Math.round(cm * 567);

// const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// const replaceOrAppendTag = (
//   xml,
//   singleTagRegex,
//   newTag,
//   fallbackInsertBefore = null,
// ) => {
//   if (singleTagRegex.test(xml)) {
//     return xml.replace(singleTagRegex, newTag);
//   }

//   if (fallbackInsertBefore && fallbackInsertBefore.test(xml)) {
//     return xml.replace(fallbackInsertBefore, `${newTag}$&`);
//   }

//   return xml + newTag;
// };

// const updateStyleBlock = (stylesXml, styleId, updater) => {
//   const styleRegex = new RegExp(
//     `(<w:style\\b[^>]*w:styleId="${escapeRegExp(styleId)}"[^>]*>[\\s\\S]*?<\\/w:style>)`,
//     "g",
//   );

//   if (!styleRegex.test(stylesXml)) {
//     console.warn(`[applyActTemplateParams] style not found: ${styleId}`);
//     return stylesXml;
//   }

//   return stylesXml.replace(styleRegex, (styleBlock) => updater(styleBlock));
// };

// const ensurePPr = (styleBlock, mutator) => {
//   const pPrRegex = /<w:pPr>([\s\S]*?)<\/w:pPr>/;

//   if (pPrRegex.test(styleBlock)) {
//     return styleBlock.replace(pPrRegex, (_, inner) => {
//       const updatedInner = mutator(inner);
//       return `<w:pPr>${updatedInner}</w:pPr>`;
//     });
//   }

//   const updatedInner = mutator("");

//   return styleBlock.replace(
//     /(<w:style\b[^>]*>)/,
//     `$1<w:pPr>${updatedInner}</w:pPr>`,
//   );
// };

// const ensureRPr = (styleBlock, mutator) => {
//   const rPrRegex = /<w:rPr>([\s\S]*?)<\/w:rPr>/;

//   if (rPrRegex.test(styleBlock)) {
//     return styleBlock.replace(rPrRegex, (_, inner) => {
//       const updatedInner = mutator(inner);
//       return `<w:rPr>${updatedInner}</w:rPr>`;
//     });
//   }

//   const updatedInner = mutator("");

//   return styleBlock.replace(
//     /(<w:style\b[^>]*>)/,
//     `$1<w:rPr>${updatedInner}</w:rPr>`,
//   );
// };

// const setSpacing = (pPrInner, { before, line, lineRule = "auto" }) => {
//   const spacingRegex = /<w:spacing\b[^>]*\/>/;

//   let spacingTag = "<w:spacing";

//   if (before != null) {
//     spacingTag += ` w:before="${before}"`;
//   }

//   if (line != null) {
//     spacingTag += ` w:line="${line}" w:lineRule="${lineRule}"`;
//   }

//   spacingTag += "/>";

//   if (spacingRegex.test(pPrInner)) {
//     return pPrInner.replace(spacingRegex, spacingTag);
//   }

//   return spacingTag + pPrInner;
// };

// const setKeepNext = (pPrInner, enabled) => {
//   if (!enabled) return pPrInner;
//   if (/<w:keepNext\/>/.test(pPrInner)) return pPrInner;
//   return `<w:keepNext/>${pPrInner}`;
// };

// const setKeepLines = (pPrInner, enabled) => {
//   if (!enabled) return pPrInner;
//   if (/<w:keepLines\/>/.test(pPrInner)) return pPrInner;
//   return `<w:keepLines/>${pPrInner}`;
// };

// const setFontSize = (rPrInner, halfPoints) => {
//   let updated = rPrInner;

//   updated = replaceOrAppendTag(
//     updated,
//     /<w:sz\b[^>]*\/>/,
//     `<w:sz w:val="${halfPoints}"/>`,
//   );

//   updated = replaceOrAppendTag(
//     updated,
//     /<w:szCs\b[^>]*\/>/,
//     `<w:szCs w:val="${halfPoints}"/>`,
//   );

//   return updated;
// };

// const applyMarginsToDocument = (documentXml, margins) => {
//   const { topCm, leftCm, rightCm, bottomCm } = margins;

//   const top = cmToTwips(topCm);
//   const left = cmToTwips(leftCm);
//   const right = cmToTwips(rightCm);
//   const bottom = cmToTwips(bottomCm);

//   const pgMarRegex = /<w:pgMar\b[^>]*\/>/;

//   if (!pgMarRegex.test(documentXml)) {
//     console.warn(
//       "[applyActTemplateParams] <w:pgMar/> not found in document.xml",
//     );
//     return documentXml;
//   }

//   return documentXml.replace(pgMarRegex, (tag) => {
//     let updated = tag;

//     updated = /w:top="[^"]*"/.test(updated)
//       ? updated.replace(/w:top="[^"]*"/, `w:top="${top}"`)
//       : updated.replace("/>", ` w:top="${top}"/>`);

//     updated = /w:left="[^"]*"/.test(updated)
//       ? updated.replace(/w:left="[^"]*"/, `w:left="${left}"`)
//       : updated.replace("/>", ` w:left="${left}"/>`);

//     updated = /w:right="[^"]*"/.test(updated)
//       ? updated.replace(/w:right="[^"]*"/, `w:right="${right}"`)
//       : updated.replace("/>", ` w:right="${right}"/>`);

//     updated = /w:bottom="[^"]*"/.test(updated)
//       ? updated.replace(/w:bottom="[^"]*"/, `w:bottom="${bottom}"`)
//       : updated.replace("/>", ` w:bottom="${bottom}"/>`);

//     return updated;
//   });
// };

// const applyActTemplateParams = (buffer, profile) => {
//   const zip = new PizZip(buffer);

//   let stylesXml = getXmlFile(zip, "word/styles.xml");
//   let documentXml = getXmlFile(zip, "word/document.xml");

//   if (profile.margins) {
//     documentXml = applyMarginsToDocument(documentXml, profile.margins);
//   }

//   stylesXml = updateStyleBlock(stylesXml, "ActApprovalArea", (styleBlock) => {
//     let updated = ensurePPr(styleBlock, (pPrInner) =>
//       setSpacing(pPrInner, {
//         line: lineSpacingToTwips(profile.approvalAreaLineSpacing),
//         lineRule: "auto",
//       }),
//     );

//     updated = ensureRPr(updated, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
//     );

//     return updated;
//   });

//   stylesXml = updateStyleBlock(stylesXml, "ActDocumentTitle", (styleBlock) => {
//     let updated = ensurePPr(styleBlock, (pPrInner) =>
//       setSpacing(pPrInner, {
//         before: ptToTwips(profile.documentTitleSpacingBeforePt),
//       }),
//     );

//     updated = ensureRPr(updated, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
//     );

//     return updated;
//   });

//   stylesXml = updateStyleBlock(stylesXml, "ActMainText", (styleBlock) => {
//     let updated = ensurePPr(styleBlock, (pPrInner) =>
//       setSpacing(pPrInner, {
//         line: lineSpacingToTwips(profile.mainLineSpacing),
//         lineRule: "auto",
//       }),
//     );

//     updated = ensureRPr(updated, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
//     );

//     return updated;
//   });

//   stylesXml = updateStyleBlock(stylesXml, "ActSectionHeading", (styleBlock) => {
//     let updated = ensurePPr(styleBlock, (pPrInner) => {
//       let next = setSpacing(pPrInner, {
//         before: ptToTwips(profile.verticalSpacingBeforePt),
//       });

//       next = setKeepNext(next, Boolean(profile.headingsKeepWithNext));
//       return next;
//     });

//     updated = ensureRPr(updated, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.mainTextPt)),
//     );

//     return updated;
//   });

//   stylesXml = updateStyleBlock(stylesXml, "ActSignatureBlock", (styleBlock) => {
//     let updated = ensurePPr(styleBlock, (pPrInner) => {
//       let next = setSpacing(pPrInner, {
//         line: lineSpacingToTwips(profile.mainLineSpacing),
//         lineRule: "auto",
//       });

//       next = setKeepLines(next, Boolean(profile.signatureBlockKeepTogether));
//       return next;
//     });

//     updated = ensureRPr(updated, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.signatureBlockPt)),
//     );

//     return updated;
//   });

//   stylesXml = updateStyleBlock(stylesXml, "ActSignatureHint", (styleBlock) =>
//     ensureRPr(styleBlock, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.signatureHintPt)),
//     ),
//   );

//   stylesXml = updateStyleBlock(stylesXml, "ActTableText", (styleBlock) => {
//     let updated = ensurePPr(styleBlock, (pPrInner) =>
//       setSpacing(pPrInner, {
//         line: lineSpacingToTwips(profile.tableLineSpacing),
//         lineRule: "auto",
//       }),
//     );

//     updated = ensureRPr(updated, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.tableTextPt)),
//     );

//     return updated;
//   });

//   stylesXml = updateStyleBlock(stylesXml, "ActStaticHeader", (styleBlock) =>
//     ensureRPr(styleBlock, (rPrInner) =>
//       setFontSize(rPrInner, ptToHalfPoints(profile.staticHeaderPt)),
//     ),
//   );

//   setXmlFile(zip, "word/styles.xml", stylesXml);
//   setXmlFile(zip, "word/document.xml", documentXml);

//   return zip.generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });
// };

// module.exports = applyActTemplateParams;
