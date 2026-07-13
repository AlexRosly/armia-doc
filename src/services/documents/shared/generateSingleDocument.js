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
