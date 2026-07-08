// const fs = require("fs/promises");
// const { generateSingleTemplate } = require("../shared");
// const { mergeDocuments } = require("../../word");
// const buildTemplateDataOrderMain = require("./buildTemplateDataOrderMain");
// const buildTemplateDataOrderApproval = require("./buildTemplateDataOrderApproval");

// const generateOrderDocument = async (payload, outputPath, profile) => {
//   const mainTemplate = profile.templates?.main;
//   const approvalTemplate = profile.templates?.approval;

//   if (!mainTemplate || !approvalTemplate) {
//     throw new Error(
//       "Order profile must contain templates.main and templates.approval",
//     );
//   }

//   const mainData = buildTemplateDataOrderMain(payload, profile);
//   const approvalData = buildTemplateDataOrderApproval(payload, profile);

//   const mainBuffer = await generateSingleTemplate({
//     documentType: "order",
//     template: mainTemplate,
//     data: mainData,
//   });

//   const approvalBuffer = await generateSingleTemplate({
//     documentType: "order",
//     template: approvalTemplate,
//     data: approvalData,
//   });

//   const mergedBuffer = mergeDocuments([mainBuffer, approvalBuffer]);

//   await fs.writeFile(outputPath, mergedBuffer);

//   return outputPath;
// };

// module.exports = generateOrderDocument;
// const fs = require("fs/promises");
// const { generateSingleTemplate } = require("../shared");
// const { mergeDocuments } = require("../../word");
// const buildTemplateDataOrder = require("./buildTemplateDataOrder");

// const generateOrderDocument = async (payload, outputPath, profile) => {
//   const mainTemplate = profile.templates?.main;
//   const approvalTemplate = profile.templates?.approval;

//   if (!mainTemplate || !approvalTemplate) {
//     throw new Error(
//       "Order profile must contain templates.main and templates.approval",
//     );
//   }

//   const data = buildTemplateDataOrder(payload, profile);

//   const mainBuffer = await generateSingleTemplate({
//     documentType: "order",
//     template: mainTemplate,
//     data,
//   });

//   const approvalBuffer = await generateSingleTemplate({
//     documentType: "order",
//     template: approvalTemplate,
//     data,
//   });

//   const mergedBuffer = mergeDocuments([mainBuffer, approvalBuffer]);

//   await fs.writeFile(outputPath, mergedBuffer);

//   return outputPath;
// };

// module.exports = generateOrderDocument;
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

  await fs.writeFile(outputPath.replace(".docx", "_order.docx"), orderBuffer);

  await fs.writeFile(
    outputPath.replace(".docx", "_approval.docx"),
    approvalBuffer,
  );

  const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer], {
    insertPageBreak: false,
    debug: false,
  });

  await fs.writeFile(outputPath, mergedBuffer);

  return outputPath;
};

module.exports = generateOrderDocument;
// const fs = require("fs/promises");
// const buildTemplateData = require("./buildTemplateDataOrder");
// const { generateSingleTemplate } = require("../shared");
// const { mergeDocuments } = require("../../word");

// const generateOrderDocument = async (payload, outputPath, profile) => {
//   if (!profile?.orderProfile?.template) {
//     throw new Error("profile.orderProfile.template is required");
//   }

//   if (!profile?.approvalProfile?.template) {
//     throw new Error("profile.approvalProfile.template is required");
//   }

//   const data = buildTemplateData(payload);

//   const orderBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "order",
//     template: profile.orderProfile.template,
//     data,
//   });

//   const approvalBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "approval",
//     template: profile.approvalProfile.template,
//     data,
//   });

//   await fs.writeFile(
//     outputPath.replace(".docx", "_part_order.docx"),
//     orderBuffer,
//   );
//   await fs.writeFile(
//     outputPath.replace(".docx", "_part_approval.docx"),
//     approvalBuffer,
//   );

//   const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer]);

//   await fs.writeFile(outputPath, mergedBuffer);

//   return outputPath;
// };

// module.exports = generateOrderDocument;

// const generateOrderDocument = async (payload, outputPath, profile) => {
//   if (!profile?.orderProfile?.template) {
//     throw new Error("Order profile.orderProfile.template is required");
//   }

//   if (!profile?.approvalProfile?.template) {
//     throw new Error("Order profile.approvalProfile.template is required");
//   }

//   const data = buildTemplateData(payload, profile);

//   const orderBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "order",
//     template: profile.orderProfile.template,
//     data,
//   });

//   const approvalBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "approval",
//     template: profile.approvalProfile.template,
//     data,
//   });

//   const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer]);

//   await fs.writeFile(outputPath, mergedBuffer);

//   return outputPath;
// };

// module.exports = generateOrderDocument;
