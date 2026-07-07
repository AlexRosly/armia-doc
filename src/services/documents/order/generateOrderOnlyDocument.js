const { generateSingleTemplate } = require("../shared");
const buildTemplateData = require("./buildTemplateDataOrder");

const generateOrderOnlyDocument = async (payload, outputPath, profile) => {
  if (!profile?.template) {
    throw new Error("Order profile.template is required");
  }

  const data = buildTemplateData(payload);

  return generateSingleTemplate({
    documentType: "order",
    templateSubfolder: "order",
    template: profile.template,
    data,
    outputPath,
  });
};

module.exports = generateOrderOnlyDocument;
