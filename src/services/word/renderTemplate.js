// const fs = require("fs/promises");
// const path = require("path");

// const PizZip = require("pizzip");
// const Docxtemplater = require("docxtemplater");

// const renderTemplate = async ({
//   templatePath,
//   data,
//   outputPath = null,
//   returnBuffer = false,
// }) => {
//   //
//   // LOAD TEMPLATE
//   //

//   const template = await fs.readFile(templatePath);

//   //
//   // OPEN ZIP
//   //

//   const zip = new PizZip(template);

//   //
//   // DOCXTEMPLATER
//   //

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,
//     linebreaks: true,
//   });

//   //
//   // RENDER VARIABLES
//   //

//   doc.render(data);

//   //
//   // RESULT BUFFER
//   //

//   const buffer = doc.getZip().generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });

//   //
//   // RETURN BUFFER
//   //

//   if (returnBuffer) {
//     return buffer;
//   }
//   //
//   // SAVE FILE
//   //

//   if (outputPath) {
//     await fs.mkdir(path.dirname(outputPath), {
//       recursive: true,
//     });

//     await fs.writeFile(outputPath, buffer);

//     return outputPath;
//   }

//   return buffer;
// };

// module.exports = renderTemplate;

// // template
// //       │
// //       ▼
// // Docxtemplater
// //       │
// //       ▼
// // Buffer
// //       │
// //  ┌────┴─────────────┐
// //  ▼                  ▼
// // save file        merge engine
// const fs = require("fs");
// const PizZip = require("pizzip");
// const Docxtemplater = require("docxtemplater");

// const renderTemplate = ({ templatePath, data, outputPath }) => {
//   const content = fs.readFileSync(templatePath, "binary");
//   const zip = new PizZip(content);

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,
//     linebreaks: true,
//   });

//   doc.render(data);

//   const buffer = doc.getZip().generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });

//   if (outputPath) {
//     fs.writeFileSync(outputPath, buffer);
//   }

//   return buffer;
// };

// module.exports = renderTemplate;
// const fs = require("fs");
// const PizZip = require("pizzip");
// const Docxtemplater = require("docxtemplater");

// const renderTemplate = ({ templatePath, data, outputPath }) => {
//   const content = fs.readFileSync(templatePath, "binary");
//   const zip = new PizZip(content);

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,
//     linebreaks: true,
//   });

//   doc.render(data);

//   const buffer = doc.getZip().generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });

//   if (outputPath) {
//     fs.writeFileSync(outputPath, buffer);
//   }

//   return buffer;
// };

// module.exports = renderTemplate;
// const fs = require("fs");
// const PizZip = require("pizzip");
// const Docxtemplater = require("docxtemplater");

// const renderTemplate = ({ templatePath, data, outputPath }) => {
//   const content = fs.readFileSync(templatePath, "binary");
//   const zip = new PizZip(content);

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,
//     linebreaks: true,
//   });

//   doc.render(data);

//   const buffer = doc.getZip().generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });

//   if (outputPath) {
//     fs.writeFileSync(outputPath, buffer);
//   }

//   return buffer;
// };

// module.exports = renderTemplate;
// const fs = require("fs");
// const PizZip = require("pizzip");
// const Docxtemplater = require("docxtemplater");

// const renderTemplate = ({ templatePath, data, outputPath }) => {
//   const content = fs.readFileSync(templatePath, "binary");
//   const zip = new PizZip(content);

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,
//     linebreaks: true,
//   });

//   doc.render(data);

//   const buffer = doc.getZip().generate({
//     type: "nodebuffer",
//     compression: "DEFLATE",
//   });

//   if (outputPath) {
//     fs.writeFileSync(outputPath, buffer);
//   }

//   return buffer;
// };

// module.exports = renderTemplate;
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const renderTemplate = ({ templatePath, data, outputPath }) => {
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);

  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  if (outputPath) {
    fs.writeFileSync(outputPath, buffer);
  }

  return buffer;
};

module.exports = renderTemplate;
