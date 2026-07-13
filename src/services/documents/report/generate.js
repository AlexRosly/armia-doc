const buildTemplateData = require("./buildTemplateDataReport");
const { generateSingleTemplate } = require("../shared");

const generateReportDocument = async (payload, outputPath, profile) => {
  if (!profile?.template) {
    throw new Error("Report profile.template is required");
  }

  const data = buildTemplateData(payload, profile);

  return generateSingleTemplate({
    documentType: "report",
    template: profile.template,
    data,
    outputPath,
  });
};

module.exports = generateReportDocument;
