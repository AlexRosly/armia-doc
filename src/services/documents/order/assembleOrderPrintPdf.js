const fs = require("fs/promises");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const DEFAULT_PRINT_SETTINGS = {
  insertBlankPages: true,
  blankPageStrategy: "after_each_order_page_except_last",
  approvalPagePlacement: "append_after_order",
};

const normalizePrintSettings = (printSettings = {}) => ({
  ...DEFAULT_PRINT_SETTINGS,
  ...printSettings,
});

const buildPageIndexes = (pageCount) =>
  Array.from({ length: pageCount }, (_, i) => i);

const addBlankPage = ({ outputPdf, sourcePage }) => {
  const { width, height } = sourcePage.getSize();
  outputPdf.addPage([width, height]);
};

const appendPages = (outputPdf, pages) => {
  for (const page of pages) {
    outputPdf.addPage(page);
  }
};

const assembleOrderPrintPdf = async ({
  orderPdfPath,
  approvalPdfPath,
  outputPdfPath,
  printSettings = {},
}) => {
  const settings = normalizePrintSettings(printSettings);

  const [orderPdfBytes, approvalPdfBytes] = await Promise.all([
    fs.readFile(orderPdfPath),
    fs.readFile(approvalPdfPath),
  ]);

  const orderPdf = await PDFDocument.load(orderPdfBytes);
  const approvalPdf = await PDFDocument.load(approvalPdfBytes);
  const outputPdf = await PDFDocument.create();

  const orderPageCount = orderPdf.getPageCount();
  const approvalPageCount = approvalPdf.getPageCount();

  if (orderPageCount < 1) {
    throw new Error(`Order PDF has invalid page count: ${orderPageCount}`);
  }

  if (approvalPageCount < 1) {
    throw new Error(
      `Approval PDF has invalid page count: ${approvalPageCount}`,
    );
  }

  const orderPages = await outputPdf.copyPages(
    orderPdf,
    buildPageIndexes(orderPageCount),
  );

  const approvalPages = await outputPdf.copyPages(
    approvalPdf,
    buildPageIndexes(approvalPageCount),
  );

  let insertedBlankPageCount = 0;

  for (let i = 0; i < orderPages.length; i++) {
    const page = orderPages[i];
    outputPdf.addPage(page);

    const isLastOrderPage = i === orderPages.length - 1;

    if (
      settings.insertBlankPages &&
      settings.blankPageStrategy === "after_each_order_page_except_last" &&
      !isLastOrderPage
    ) {
      insertedBlankPageCount += 1;

      addBlankPage({
        outputPdf,
        sourcePage: page,
      });
    }
  }

  if (
    settings.approvalPagePlacement === "back_of_last_order_sheet" ||
    settings.approvalPagePlacement === "append_after_order"
  ) {
    appendPages(outputPdf, approvalPages);
  } else {
    throw new Error(
      `Unsupported approvalPagePlacement: ${settings.approvalPagePlacement}`,
    );
  }

  const totalPageCount = outputPdf.getPageCount();

  await fs.mkdir(path.dirname(outputPdfPath), { recursive: true });
  await fs.writeFile(outputPdfPath, await outputPdf.save());

  return {
    outputPdfPath,
    orderPageCount,
    insertedBlankPageCount,
    approvalPageCount,
    totalPageCount,
    appliedPrintSettings: settings,
  };
};

module.exports = assembleOrderPrintPdf;
