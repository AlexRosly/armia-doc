const fs = require("fs/promises");
const buildOrderTemplateData = require("./buildTemplateDataOrder");
const buildApprovalTemplateData = require("./buildTemplateDataApproval");
const { generateSingleTemplate } = require("../shared");
const { mergeDocuments } = require("../../word");

const generateOrderDocument = async (payload, outputPath, profile) => {
  if (!profile?.orderProfile?.template) {
    throw new Error("profile.orderProfile.template is required");
  }

  if (!profile?.approvalProfile?.template) {
    throw new Error("profile.approvalProfile.template is required");
  }

  const orderData = buildOrderTemplateData(payload);
  const approvalData = buildApprovalTemplateData(payload);

  const orderBuffer = await generateSingleTemplate({
    documentType: "order",
    templateSubfolder: "order",
    template: profile.orderProfile.template,
    data: orderData,
  });

  const approvalBuffer = await generateSingleTemplate({
    documentType: "order",
    templateSubfolder: "approval",
    template: profile.approvalProfile.template,
    data: approvalData,
  });

  const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer], {
    insertPageBreak: true,
  });

  await fs.writeFile(outputPath, mergedBuffer);

  return outputPath;
};

module.exports = generateOrderDocument;
