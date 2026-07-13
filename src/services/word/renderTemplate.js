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
