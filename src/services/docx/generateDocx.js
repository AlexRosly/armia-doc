// const fs = require("fs");
// const path = require("path");

// const PizZip = require("pizzip");
// const Docxtemplater = require("docxtemplater");

// const buildTemplateData = require("./buildTemplateData");
// // const { profile } = require("console");

// const generateDocx = async (payload, outputPath, profile = {}) => {
//   // const templatePath = path.join(
//   //   process.cwd(),
//   //   "templates",
//   //   // "report-template.docx",
//   //   "test.docx",
//   // );
//   const templateName = profile?.template || "test.docx";
//   // const templateName = "test.docx";

//   // const templatePath = path.join(process.cwd(), "templates", templateName);
//   const templatePath = path.join(
//     process.cwd(),
//     "services",
//     "documents",
//     payload.documentType,
//     "templates",
//     `${profile.name}.docx`,
//   );

//   const content = fs.readFileSync(templatePath, "binary");

//   const zip = new PizZip(content);

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,
//     linebreaks: true,
//   });

//   doc.render(buildTemplateData(payload, profile)); // add profile

//   const buffer = doc.getZip().generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });

//   fs.writeFileSync(outputPath, buffer);

//   return outputPath;
//   // profileName: profile?.name, // add in return
//   // fontSize: profile?.fontSize,
//   // lineSpacing: profile?.lineSpacing,
//   // topMargin: profile?.topMargin,
// };

// module.exports = generateDocx;
const fs = require("fs");
const path = require("path");

const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

// const buildTemplateData = require("./buildTemplateData");
const documents = require("../documents");

const generateDocx = async (payload, outputPath, profile = {}) => {
  const documentConfig = documents[payload.documentType];

  if (!documentConfig) {
    throw new Error(`Unknown document type: ${payload.documentType}`);
  }

  const templatePath = path.join(
    process.cwd(),
    "src",
    "services",
    "documents",
    payload.documentType,
    "templates",
    profile.template,
  );

  const content = fs.readFileSync(templatePath, "binary");

  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const templateData = documentConfig.buildTemplateData(payload, profile);

  doc.render(templateData);

  const buffer = doc.getZip().generate({
    type: "nodebuffer",

    compression: "DEFLATE",
  });

  fs.writeFileSync(outputPath, buffer);

  return outputPath;
};

module.exports = generateDocx;
// const generateDocx = async (payload, outputPath, profile = {}) => {
//   const templateName = profile.template || "test.docx";

//   const templatePath = path.join(
//     process.cwd(),

//     "services",

//     "documents",

//     payload.documentType,

//     "templates",

//     templateName,
//   );

//   const content = fs.readFileSync(templatePath, "binary");

//   const zip = new PizZip(content);

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,

//     linebreaks: true,
//   });

//   doc.render(buildTemplateData(payload, profile));

//   const buffer = doc.getZip().generate({
//     type: "nodebuffer",

//     compression: "DEFLATE",
//   });

//   fs.writeFileSync(
//     outputPath,

//     buffer,
//   );

//   return outputPath;
// };

// module.exports = generateDocx;
