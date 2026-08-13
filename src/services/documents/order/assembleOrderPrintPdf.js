// const fs = require("fs/promises");
// const path = require("path");
// const { PDFDocument } = require("pdf-lib");

// const DEFAULT_PRINT_SETTINGS = {
//   insertBlankPages: true,
//   blankPageStrategy: "after_each_order_page_except_last",
//   approvalPagePlacement: "append_after_order",
// };

// const normalizePrintSettings = (printSettings = {}) => ({
//   ...DEFAULT_PRINT_SETTINGS,
//   ...printSettings,
// });

// const buildPageIndexes = (pageCount) =>
//   Array.from({ length: pageCount }, (_, i) => i);

// const addBlankPage = ({ outputPdf, sourcePage }) => {
//   const { width, height } = sourcePage.getSize();
//   outputPdf.addPage([width, height]);
// };

// const appendPages = (outputPdf, pages) => {
//   for (const page of pages) {
//     outputPdf.addPage(page);
//   }
// };

// const assembleOrderPrintPdf = async ({
//   orderPdfPath,
//   approvalPdfPath,
//   outputPdfPath,
//   printSettings = {},
// }) => {
//   const settings = normalizePrintSettings(printSettings);

//   const [orderPdfBytes, approvalPdfBytes] = await Promise.all([
//     fs.readFile(orderPdfPath),
//     fs.readFile(approvalPdfPath),
//   ]);

//   const orderPdf = await PDFDocument.load(orderPdfBytes);
//   const approvalPdf = await PDFDocument.load(approvalPdfBytes);
//   const outputPdf = await PDFDocument.create();

//   const orderPageCount = orderPdf.getPageCount();
//   const approvalPageCount = approvalPdf.getPageCount();

//   if (orderPageCount < 1) {
//     throw new Error(`Order PDF has invalid page count: ${orderPageCount}`);
//   }

//   if (approvalPageCount < 1) {
//     throw new Error(
//       `Approval PDF has invalid page count: ${approvalPageCount}`,
//     );
//   }

//   const orderPages = await outputPdf.copyPages(
//     orderPdf,
//     buildPageIndexes(orderPageCount),
//   );

//   const approvalPages = await outputPdf.copyPages(
//     approvalPdf,
//     buildPageIndexes(approvalPageCount),
//   );

//   let insertedBlankPageCount = 0;

//   for (let i = 0; i < orderPages.length; i++) {
//     const page = orderPages[i];
//     outputPdf.addPage(page);

//     const isLastOrderPage = i === orderPages.length - 1;

//     if (
//       settings.insertBlankPages &&
//       settings.blankPageStrategy === "after_each_order_page_except_last" &&
//       !isLastOrderPage
//     ) {
//       insertedBlankPageCount += 1;

//       addBlankPage({
//         outputPdf,
//         sourcePage: page,
//       });
//     }
//   }

//   if (
//     settings.approvalPagePlacement === "back_of_last_order_sheet" ||
//     settings.approvalPagePlacement === "append_after_order"
//   ) {
//     appendPages(outputPdf, approvalPages);
//   } else {
//     throw new Error(
//       `Unsupported approvalPagePlacement: ${settings.approvalPagePlacement}`,
//     );
//   }

//   const totalPageCount = outputPdf.getPageCount();

//   await fs.mkdir(path.dirname(outputPdfPath), { recursive: true });
//   await fs.writeFile(outputPdfPath, await outputPdf.save());

//   return {
//     outputPdfPath,
//     orderPageCount,
//     insertedBlankPageCount,
//     approvalPageCount,
//     totalPageCount,
//     appliedPrintSettings: settings,
//   };
// };

// module.exports = assembleOrderPrintPdf;
const fs = require("fs/promises");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const LOG_PREFIX = "[assembleOrderPrintPdf]";

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

  console.log(`${LOG_PREFIX} start`);
  console.log(`${LOG_PREFIX} orderPdfPath=${orderPdfPath}`);
  console.log(`${LOG_PREFIX} approvalPdfPath=${approvalPdfPath}`);
  console.log(`${LOG_PREFIX} outputPdfPath=${outputPdfPath}`);
  console.log(`${LOG_PREFIX} settings=${JSON.stringify(settings)}`);

  const [orderPdfBytes, approvalPdfBytes] = await Promise.all([
    fs.readFile(orderPdfPath),
    fs.readFile(approvalPdfPath),
  ]);

  const orderPdf = await PDFDocument.load(orderPdfBytes);
  const approvalPdf = await PDFDocument.load(approvalPdfBytes);
  const outputPdf = await PDFDocument.create();

  const orderPageCount = orderPdf.getPageCount();
  const approvalPageCount = approvalPdf.getPageCount();

  console.log(
    `${LOG_PREFIX} source counts orderPageCount=${orderPageCount} approvalPageCount=${approvalPageCount}`,
  );

  if (orderPageCount < 1) {
    throw new Error(`Order PDF has invalid page count: ${orderPageCount}`);
  }

  if (approvalPageCount !== 1) {
    throw new Error(
      `Approval PDF must contain exactly 1 page, got: ${approvalPageCount}`,
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

    const physicalPageNumber = outputPdf.getPageCount();
    const isLastOrderPage = i === orderPages.length - 1;

    console.log(
      `${LOG_PREFIX} appended order page logical=${i + 1} physical=${physicalPageNumber}`,
    );

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

      console.log(
        `${LOG_PREFIX} inserted blank page after order logical=${i + 1} blankPhysical=${outputPdf.getPageCount()}`,
      );
    }
  }

  if (
    settings.approvalPagePlacement === "back_of_last_order_sheet" ||
    settings.approvalPagePlacement === "append_after_order"
  ) {
    appendPages(outputPdf, approvalPages);
    console.log(
      `${LOG_PREFIX} appended approval page physical=${outputPdf.getPageCount()}`,
    );
  } else {
    throw new Error(
      `Unsupported approvalPagePlacement: ${settings.approvalPagePlacement}`,
    );
  }

  const totalPageCount = outputPdf.getPageCount();
  const expectedBlankPageCount = Math.max(orderPageCount - 1, 0);
  const expectedTotalPageCount =
    orderPageCount + expectedBlankPageCount + approvalPageCount;

  console.log(
    `${LOG_PREFIX} summary order=${orderPageCount} blank=${insertedBlankPageCount} approval=${approvalPageCount} total=${totalPageCount}`,
  );
  console.log(
    `${LOG_PREFIX} expected blank=${expectedBlankPageCount} expected total=${expectedTotalPageCount}`,
  );

  if (
    settings.insertBlankPages &&
    settings.blankPageStrategy === "after_each_order_page_except_last"
  ) {
    if (insertedBlankPageCount !== expectedBlankPageCount) {
      throw new Error(
        `Inserted blank page count mismatch: expected=${expectedBlankPageCount}, actual=${insertedBlankPageCount}`,
      );
    }

    if (totalPageCount !== expectedTotalPageCount) {
      throw new Error(
        `Total assembled page count mismatch: expected=${expectedTotalPageCount}, actual=${totalPageCount}`,
      );
    }
  }

  await fs.mkdir(path.dirname(outputPdfPath), { recursive: true });
  await fs.writeFile(outputPdfPath, await outputPdf.save());

  console.log(`${LOG_PREFIX} done outputPdfPath=${outputPdfPath}`);

  return {
    outputPdfPath,
    orderPageCount,
    insertedBlankPageCount,
    approvalPageCount,
    totalPageCount,
    expectedBlankPageCount,
    expectedTotalPageCount,
    appliedPrintSettings: settings,
  };
};

module.exports = assembleOrderPrintPdf;
