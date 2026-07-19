const fs = require("fs/promises");
const PizZip = require("pizzip");

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const mmToTwips = (mm) => Math.round((Number(mm) / 25.4) * 1440);

const normalizePrintMode = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "single-sided" ||
    normalized === "single_side" ||
    normalized === "single" ||
    normalized === "singlesided" ||
    normalized === "one-sided" ||
    normalized === "onesided"
  ) {
    return "single-sided";
  }

  if (
    normalized === "duplex" ||
    normalized === "double_side" ||
    normalized === "double-sided" ||
    normalized === "doublesided"
  ) {
    return "duplex";
  }

  return "duplex";
};

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");

const hasExplicitValue = (value) =>
  value !== undefined && value !== null && value !== "";

const resolveTwips = (twipsValue, mmValue, fallback = undefined) => {
  if (hasExplicitValue(twipsValue)) {
    return Number(twipsValue);
  }

  if (hasExplicitValue(mmValue)) {
    return mmToTwips(mmValue);
  }

  return fallback;
};

const parseAttributes = (tag) => {
  const attrs = {};
  const regex = /([a-zA-Z0-9_:.-]+)\s*=\s*"([^"]*)"/g;
  let match;

  while ((match = regex.exec(tag))) {
    attrs[match[1]] = match[2];
  }

  return attrs;
};

const buildPgMarTag = (attrs) => {
  const orderedKeys = [
    "w:top",
    "w:right",
    "w:bottom",
    "w:left",
    "w:header",
    "w:footer",
    "w:gutter",
  ];

  const used = new Set();
  const parts = [];

  for (const key of orderedKeys) {
    if (attrs[key] !== undefined) {
      parts.push(`${key}="${escapeAttr(attrs[key])}"`);
      used.add(key);
    }
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (!used.has(key)) {
      parts.push(`${key}="${escapeAttr(value)}"`);
    }
  }

  return `<w:pgMar ${parts.join(" ")}/>`;
};

const updatePgMarTag = (pgMarTag, patch) => {
  const attrs = parseAttributes(pgMarTag);

  if (patch.top !== undefined) attrs["w:top"] = String(patch.top);
  if (patch.right !== undefined) attrs["w:right"] = String(patch.right);
  if (patch.bottom !== undefined) attrs["w:bottom"] = String(patch.bottom);
  if (patch.left !== undefined) attrs["w:left"] = String(patch.left);
  if (patch.header !== undefined) attrs["w:header"] = String(patch.header);
  if (patch.footer !== undefined) attrs["w:footer"] = String(patch.footer);
  if (patch.gutter !== undefined) attrs["w:gutter"] = String(patch.gutter);

  return buildPgMarTag(attrs);
};

const injectPgMarIntoSectPr = (sectPrXml, patch) => {
  const pgMarMatch = sectPrXml.match(/<w:pgMar\b[^>]*\/>/);

  if (pgMarMatch) {
    const updated = updatePgMarTag(pgMarMatch[0], patch);
    return sectPrXml.replace(pgMarMatch[0], updated);
  }

  if (Object.keys(patch).length === 0) {
    return sectPrXml;
  }

  const newPgMar = buildPgMarTag({
    "w:top": String(patch.top ?? 0),
    "w:right": String(patch.right ?? 0),
    "w:bottom": String(patch.bottom ?? 0),
    "w:left": String(patch.left ?? 0),
    "w:header": String(patch.header ?? 0),
    "w:footer": String(patch.footer ?? 0),
    "w:gutter": String(patch.gutter ?? 0),
  });

  return sectPrXml.replace(/<\/w:sectPr>$/, `${newPgMar}</w:sectPr>`);
};

const updateAllSectPrMargins = (documentXml, patch) => {
  if (Object.keys(patch).length === 0) {
    return documentXml;
  }

  return documentXml.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g, (sectPrXml) =>
    injectPgMarIntoSectPr(sectPrXml, patch),
  );
};

const ensureSettingsXml = (zip) => {
  const existing = zip.file("word/settings.xml");
  if (existing) {
    return existing.asText();
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W_NS}"></w:settings>`;
};

const setMirrorMargins = (settingsXml, enabled) => {
  let xml = settingsXml;

  xml = xml.replace(/<w:mirrorMargins\b[^>]*\/>/g, "");

  if (!enabled) {
    return xml;
  }

  if (/<w:mirrorMargins\b[^>]*\/>/.test(xml)) {
    return xml;
  }

  if (/<\/w:settings>/.test(xml)) {
    return xml.replace(/<\/w:settings>/, `  <w:mirrorMargins/>\n</w:settings>`);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W_NS}">
  <w:mirrorMargins/>
</w:settings>`;
};

const extractExistingPgMar = (documentXml) => {
  const match = documentXml.match(/<w:pgMar\b[^>]*\/>/);
  if (!match) return {};

  const attrs = parseAttributes(match[0]);

  return {
    top: attrs["w:top"] != null ? Number(attrs["w:top"]) : undefined,
    right: attrs["w:right"] != null ? Number(attrs["w:right"]) : undefined,
    bottom: attrs["w:bottom"] != null ? Number(attrs["w:bottom"]) : undefined,
    left: attrs["w:left"] != null ? Number(attrs["w:left"]) : undefined,
    header: attrs["w:header"] != null ? Number(attrs["w:header"]) : undefined,
    footer: attrs["w:footer"] != null ? Number(attrs["w:footer"]) : undefined,
    gutter: attrs["w:gutter"] != null ? Number(attrs["w:gutter"]) : undefined,
  };
};

const buildMarginPatch = (profile, existingPgMar) => {
  const patch = {};

  const top = resolveTwips(
    profile.topMarginTwips,
    profile.topMarginMm ?? profile.topMargin,
    undefined,
  );
  const right = resolveTwips(
    profile.rightMarginTwips,
    profile.rightMarginMm ?? profile.rightMargin,
    undefined,
  );
  const bottom = resolveTwips(
    profile.bottomMarginTwips,
    profile.bottomMarginMm ?? profile.bottomMargin,
    undefined,
  );
  const left = resolveTwips(
    profile.leftMarginTwips,
    profile.leftMarginMm ?? profile.leftMargin,
    undefined,
  );
  const header = resolveTwips(profile.headerTwips, profile.headerMm, undefined);
  const footer = resolveTwips(profile.footerTwips, profile.footerMm, undefined);
  const gutter = resolveTwips(profile.gutterTwips, profile.gutterMm, undefined);

  if (top !== undefined) patch.top = top;
  if (right !== undefined) patch.right = right;
  if (bottom !== undefined) patch.bottom = bottom;
  if (left !== undefined) patch.left = left;
  if (header !== undefined) patch.header = header;
  if (footer !== undefined) patch.footer = footer;
  if (gutter !== undefined) patch.gutter = gutter;

  return patch;
};

const applyReportPrintSettings = async ({
  docxPath,
  printMode = "duplex",
  profile = {},
}) => {
  const normalizedPrintMode = normalizePrintMode(printMode);

  const buffer = await fs.readFile(docxPath);
  const zip = new PizZip(buffer);

  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("word/document.xml not found in DOCX");
  }

  const documentXml = documentFile.asText();
  const existingPgMar = extractExistingPgMar(documentXml);
  const marginPatch = buildMarginPatch(profile, existingPgMar);

  const updatedDocumentXml = updateAllSectPrMargins(documentXml, marginPatch);

  const settingsXml = ensureSettingsXml(zip);
  const updatedSettingsXml = setMirrorMargins(
    settingsXml,
    normalizedPrintMode === "duplex",
  );

  zip.file("word/document.xml", updatedDocumentXml);
  zip.file("word/settings.xml", updatedSettingsXml);

  const outputBuffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  await fs.writeFile(docxPath, outputBuffer);

  return {
    printMode: normalizedPrintMode,
    mirrorMarginsEnabled: normalizedPrintMode === "duplex",
    marginsUpdated: Object.keys(marginPatch).length > 0,
    marginPatch,
    existingPgMar,
  };
};

module.exports = {
  applyReportPrintSettings,
  mmToTwips,
  normalizePrintMode,
};
