// const buildTemplateData = require("./buildTemplateDataAct");
// const { generateSingleTemplate } = require("../shared");

// const generateActDocument = async (payload, outputPath, profile) => {
//   if (!profile?.template) {
//     throw new Error("Act profile.template is required");
//   }

//   const data = buildTemplateData(payload, profile);

//   return generateSingleTemplate({
//     documentType: "act",
//     template: profile.template,
//     templateSubfolder: profile.templateSubfolder,
//     data,
//     outputPath,
//   });

//   // return generateSingleTemplate({
//   //   documentType: "act",
//   //   template: profile.template,
//   //   data,
//   //   outputPath,
//   // });
// };

// module.exports = generateActDocument;
// const fs = require("fs/promises");
// const buildTemplateData = require("./buildTemplateDataAct");
// const { generateSingleTemplate } = require("../shared");
// const resolveActMaster = require("./resolveActMaster");
// const applyActTemplateParams = require("./applyActTemplateParams");

// const generateActDocument = async (payload, outputPath, profile) => {
//   if (!profile?.layoutProfile) {
//     throw new Error("Act profile.layoutProfile is required");
//   }

//   const master = resolveActMaster(profile.layoutProfile);
//   const data = buildTemplateData(payload, profile);

//   const renderedBuffer = await generateSingleTemplate({
//     documentType: "act",
//     template: master.template,
//     templateSubfolder: master.templateSubfolder,
//     data,
//   });

//   const finalBuffer = applyActTemplateParams(renderedBuffer, {
//     ...profile,
//     margins: master.margins,
//   });

//   if (outputPath) {
//     await fs.writeFile(outputPath, finalBuffer);
//     return outputPath;
//   }

//   return finalBuffer;
// };

// module.exports = generateActDocument;
// const buildTemplateData = require("./buildTemplateDataAct");
// const { generateSingleTemplate } = require("../shared");
// const resolveActMaster = require("./resolveActMaster");
// const applyActTemplateParamsToFile = require("./applyActTemplateParams");

// const generateActDocument = async (payload, outputPath, profile) => {
//   if (!profile?.layoutProfile) {
//     throw new Error("Act profile.layoutProfile is required");
//   }

//   const master = resolveActMaster(profile.layoutProfile);
//   const data = buildTemplateData(payload, profile);

//   await generateSingleTemplate({
//     documentType: "act",
//     template: master.template,
//     templateSubfolder: master.templateSubfolder,
//     data,
//     outputPath,
//   });

//   await applyActTemplateParamsToFile(outputPath, {
//     ...profile,
//     margins: master.margins,
//   });

//   return outputPath;
// };

// module.exports = generateActDocument;

const fs = require("fs/promises");
const buildTemplateData = require("./buildTemplateDataAct");
const resolveActMaster = require("./resolveActMaster");
const applyActTemplateParamsToFile = require("./applyActTemplateParams");

// ПРОВЕРЬ ПУТЬ:
const { generateSingleTemplate } = require("../shared");

const generateActDocument = async (payload, outputPath, profile) => {
  if (!profile?.layoutProfile) {
    throw new Error("Act profile.layoutProfile is required");
  }

  const master = resolveActMaster(profile.layoutProfile);
  const data = buildTemplateData(payload, profile);

  await generateSingleTemplate({
    documentType: "act",
    template: master.template,
    templateSubfolder: master.templateSubfolder,
    data,
    outputPath,
  });

  await applyActTemplateParamsToFile(outputPath, {
    ...profile,
    margins: master.margins,
  });

  return outputPath;
};

module.exports = generateActDocument;
