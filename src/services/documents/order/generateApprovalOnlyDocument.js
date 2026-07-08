const { generateSingleTemplate } = require("../shared");
const buildTemplateData = require("./buildTemplateDataApproval");

const generateApprovalOnlyDocument = async (payload, outputPath, profile) => {
  if (!profile?.template) {
    throw new Error("Approval profile.template is required");
  }

  const data = buildTemplateData(payload);

  return generateSingleTemplate({
    documentType: "order",
    templateSubfolder: "approval",
    template: profile.template,
    data,
    outputPath,
  });
};

module.exports = generateApprovalOnlyDocument;
