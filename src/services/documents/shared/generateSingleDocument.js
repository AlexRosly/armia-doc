const path = require("path");
const { renderTemplate } = require("../../word");
const { PROJECT_ROOT } = require("../../../utils");

const generateSingleDocument = ({
  documentType,
  template,
  data,
  outputPath,
  templateSubfolder,
}) => {
  const templatePath = path.join(
    PROJECT_ROOT,
    "src",
    "services",
    "documents",
    documentType,
    "templates",
    ...(templateSubfolder ? [templateSubfolder] : []),
    template,
  );

  return renderTemplate({
    templatePath,
    data,
    outputPath,
  });
};

module.exports = generateSingleDocument;

// const path = require("path");
// const { renderTemplate } = require("../../word");
// const { PROJECT_ROOT } = require("../../../utils");

// const generateSingleDocument = ({
//   documentType,
//   template,
//   data,
//   outputPath,
//   templateSubfolder,
// }) => {
//   const templatePath = path.join(
//     PROJECT_ROOT,
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
// const path = require("path");
// const { renderTemplate } = require("../../word");

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
