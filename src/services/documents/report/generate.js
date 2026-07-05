// const generateSingleTemplate = require("../shared/generateSingleTemplate");
// const buildTemplateDataReport = require("./buildTemplateDataReport");

// const generateReportDocument = async (payload, outputPath, profile) => {
//   const data = buildTemplateDataReport(payload, profile);

//   return generateSingleTemplate({
//     documentType: "report",
//     template: profile.template,
//     data,
//     outputPath,
//   });
// };

// module.exports = generateReportDocument;
// const { generateSingleTemplate } = require("../shared");
// const buildTemplateDataReport = require("./buildTemplateDataReport");

// const generateReportDocument = async (payload, outputPath, profile) => {
//   const data = buildTemplateDataReport(payload, profile);

//   return generateSingleTemplate({
//     documentType: "report",
//     template: profile.template,
//     data,
//     outputPath,
//   });
// };

// module.exports = generateReportDocument;
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

// const generateReportDocument = async (payload, outputPath, profile) => {
//   if (!profile?.template) {
//     throw new Error("Report profile.template is required");
//   }

//   const data = buildTemplateData(payload, profile);

//   return generateSingleTemplate({
//     documentType: "report",
//     template: profile.template,
//     data,
//     outputPath,
//   });
// };

// module.exports = generateReportDocument;
