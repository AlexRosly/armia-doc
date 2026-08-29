const fs = require("fs/promises");
const PizZip = require("pizzip");

const buildTemplateData = require("./buildTemplateDataAct");
const { generateSingleTemplate } = require("../shared");

const paragraphText = (paragraphXml) =>
  [...paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map((match) => match[1])
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const isRemovableEmptyParagraph = (paragraphXml) =>
  !paragraphText(paragraphXml) &&
  !/<w:(?:br|sectPr|drawing|object)\b/.test(paragraphXml);

const relaxEventHeadingPagination = (documentXml) => {
  const paragraphs = [
    ...documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g),
  ];
  const headingIndex = paragraphs.findIndex(
    (match) => paragraphText(match[0]) === "І. Опис події:",
  );

  if (headingIndex < 0) return documentXml;

  const heading = paragraphs[headingIndex];
  const relaxedHeading = heading[0].replace(
    /<w:(?:keepNext|keepLines)\b[^>]*\/>/g,
    "",
  );
  const previous = paragraphs[headingIndex - 1];
  const gapBeforeHeading = previous
    ? documentXml.slice(previous.index + previous[0].length, heading.index)
    : "";
  const removePrevious =
    previous &&
    isRemovableEmptyParagraph(previous[0]) &&
    !gapBeforeHeading.trim();
  const replacementStart = removePrevious ? previous.index : heading.index;
  const prefix = removePrevious
    ? `${documentXml.slice(0, replacementStart)}${gapBeforeHeading}`
    : documentXml.slice(0, replacementStart);

  return `${prefix}${relaxedHeading}${documentXml.slice(
    heading.index + heading[0].length,
  )}`;
};

const preserveActLiteralSpaceRuns = (buffer) => {
  const zip = new PizZip(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) return buffer;

  const documentXml = documentFile.asText();
  const normalizedXml = relaxEventHeadingPagination(
    documentXml
      .replace(
        /<w:t(?![^>]*\bxml:space=)([^>]*)> <\/w:t>/g,
        '<w:t$1 xml:space="preserve"> </w:t>',
      )
      .replace(/<w:lastRenderedPageBreak\b[^>]*\/>/g, ""),
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
