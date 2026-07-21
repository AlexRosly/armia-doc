const fs = require("fs/promises");
const PizZip = require("pizzip");
const ORDER_PRINT_ERRORS = require("./orderPrintErrors");

const validateOrderPrintSettings = async (docxPath) => {
  const buffer = await fs.readFile(docxPath);
  const zip = new PizZip(buffer);

  const settingsFile = zip.file("word/settings.xml");
  const settingsXml = settingsFile ? settingsFile.asText() : "";

  const hasMirrorMargins = /<w:mirrorMargins\b[^>]*\/>/.test(settingsXml);

  if (hasMirrorMargins) {
    return {
      ok: false,
      errors: [ORDER_PRINT_ERRORS.MIRROR_MARGINS_ENABLED],
    };
  }

  return {
    ok: true,
    errors: [],
  };
};

module.exports = validateOrderPrintSettings;
