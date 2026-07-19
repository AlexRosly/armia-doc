const buildTemplateData = require("./buildTemplateDataReport");
const { generateSingleTemplate } = require("../shared");
const {
  applyReportPrintSettings,
  normalizePrintMode,
} = require("./applyReportPrintSettings");

const generateReportDocument = async (payload, outputPath, profile) => {
  if (!profile?.template) {
    throw new Error("Report profile.template is required");
  }

  const data = buildTemplateData(payload, profile);

  await generateSingleTemplate({
    documentType: "report",
    template: profile.template,
    data,
    outputPath,
  });

  const rawPrintMode =
    payload?.data?.printSettings?.printMode ??
    payload?.printSettings?.printMode ??
    payload?.printMode ??
    "duplex";

  const printMode = normalizePrintMode(rawPrintMode);

  await applyReportPrintSettings({
    docxPath: outputPath,
    printMode,
    profile,
  });

  return outputPath;
};

module.exports = generateReportDocument;
