const fs = require("fs/promises");
const PizZip = require("pizzip");

const buildTemplateData = require("./buildTemplateDataAct");
const { generateSingleTemplate } = require("../shared");

const preserveActLiteralSpaceRuns = (buffer) => {
  const zip = new PizZip(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) return buffer;

  const documentXml = documentFile.asText();
  const normalizedXml = documentXml.replace(
    /<w:t(?![^>]*\bxml:space=)([^>]*)> <\/w:t>/g,
    '<w:t$1 xml:space="preserve"> </w:t>',
  );

  if (normalizedXml === documentXml) return buffer;

  zip.file("word/document.xml", normalizedXml);
  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

const generateActDocument = async (payload, outputPath, profile) => {
  if (!profile?.template) {
    throw new Error("Act profile.template is required");
  }

  const data = buildTemplateData(payload, profile);

  const renderedBuffer = await generateSingleTemplate({
    documentType: "act",
    template: profile.template,
    templateSubfolder: profile.templateSubfolder,
    data,
    outputPath: null,
  });

  const finalBuffer = preserveActLiteralSpaceRuns(renderedBuffer);
  await fs.writeFile(outputPath, finalBuffer);

  return outputPath;
};

module.exports = generateActDocument;
