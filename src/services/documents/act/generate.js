const buildTemplateData = require("./buildTemplateDataAct");
const { generateSingleTemplate } = require("../shared");

const generateActDocument = async (payload, outputPath, profile) => {
  if (!profile?.template) {
    throw new Error("Act profile.template is required");
  }

  const data = buildTemplateData(payload, profile);

  await generateSingleTemplate({
    documentType: "act",
    template: profile.template,
    templateSubfolder: profile.templateSubfolder,
    data,
    outputPath,
  });

  return outputPath;
};

module.exports = generateActDocument;
