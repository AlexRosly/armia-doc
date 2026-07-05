// const {renderTemplate} = require("../word");

// const path = require("path");

// const documents = require("./index");

// const generateSingleDocument = async (payload, outputPath, profile) => {
//   const documentConfig = documents[payload.documentType];

//   const templateData = documentConfig.buildTemplateData(payload, profile);

//   const templatePath = path.join(
//     process.cwd(),
//     "src",
//     "services",
//     "documents",
//     payload.documentType,
//     "templates",
//     profile.template,
//   );

//   return renderTemplate({
//     templatePath,

//     data: templateData,

//     outputPath,
//   });
// };

// module.exports = generateSingleDocument;
// const path = require("path");
// const renderTemplate = require("../../word");

// const generateSingleTemplate = ({
//   documentType,
//   template,
//   data,
//   outputPath,
// }) => {
//   const templatePath = path.join(
//     process.cwd(),
//     "src",
//     "services",
//     "documents",
//     documentType,
//     "templates",
//     template,
//   );

//   return renderTemplate({
//     templatePath,
//     data,
//     outputPath,
//   });
// };

// module.exports = generateSingleTemplate;
const path = require("path");
const { renderTemplate } = require("../../word");

const generateSingleDocument = ({
  documentType,
  template,
  data,
  outputPath,
  templateSubfolder,
}) => {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "services",
    "documents",
    documentType,
    "templates",
    ...(templateSubfolder ? [templateSubfolder] : []),
    template,
  );
  console.log("[generateSingleDocument] templatePath:", templatePath);
  return renderTemplate({
    templatePath,
    data,
    outputPath,
  });
};

module.exports = generateSingleDocument;
//
// const generateSingleDocument = ({
//   documentType,
//   template,
//   data,
//   outputPath,
//   templateSubfolder,
// }) => {
//   const templatePath = path.join(
//     process.cwd(),
//     "src",
//     "services",
//     "documents",
//     documentType,
//     "templates",
//     ...(templateSubfolder ? [templateSubfolder] : []),
//     template,
//   );

//   return renderTemplate({
//     templatePath,
//     data,
//     outputPath,
//   });
// };

// module.exports = generateSingleDocument;

// const generateSingleTemplate = ({
//   documentType,
//   template,
//   data,
//   outputPath,
// }) => {
//   const templatePath = path.join(
//     process.cwd(),
//     "src",
//     "services",
//     "documents",
//     documentType,
//     "templates",
//     template,
//   );

//   return renderTemplate({
//     templatePath,
//     data,
//     outputPath,
//   });
// };

// module.exports = generateSingleTemplate;
