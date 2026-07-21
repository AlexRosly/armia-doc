const { generateSingleTemplate } = require("../shared");

const ORDER_BLANK_PAGE_TEMPLATE = "blank-page.docx";

const generateOrderBlankPageBuffer = async () => {
  const blankBuffer = await generateSingleTemplate({
    documentType: "order",
    templateSubfolder: "blank",
    template: ORDER_BLANK_PAGE_TEMPLATE,
    data: {},
  });

  return blankBuffer;
};

module.exports = generateOrderBlankPageBuffer;
