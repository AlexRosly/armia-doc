// const { convertToPdf } = require("../../pdf");
// const validateLayout = require("../../layout/validateLayout");
// const ORDER_PRINT_SETTINGS = require("./orderPrintSettings");
// const validateOrderPrintSettings = require("./validateOrderPrintSettings");
// const validateOrderApprovalPageCount = require("./validateOrderApprovalPageCount");
// const validateOrderFinalPrintContract = require("./validateOrderFinalPrintContract");
// const prepareOrderPrintDocument = require("./prepareOrderPrintDocument");

// const generateOrderPrintReadyDocument = async ({
//   orderDocxPath,
//   approvalDocxPath,
//   finalDocxPath,
//   pdfDir,
//   buildPdfPath,
// }) => {
//   const orderPrintSettingsValidation =
//     await validateOrderPrintSettings(orderDocxPath);

//   if (!orderPrintSettingsValidation.ok) {
//     const error = new Error("Order print settings validation failed");
//     error.codes = orderPrintSettingsValidation.errors;
//     error.meta = orderPrintSettingsValidation.meta;
//     throw error;
//   }

//   await convertToPdf(orderDocxPath, pdfDir);
//   const orderPdfPath = buildPdfPath(orderDocxPath, pdfDir);

//   const orderLayout = await validateLayout(orderPdfPath, {
//     documentType: "order",
//     markers: {},
//   });

//   const orderPageCount = Array.isArray(orderLayout?.pages)
//     ? orderLayout.pages.length
//     : 0;

//   if (orderPageCount < 1) {
//     const error = new Error("Order main document page count is invalid");
//     error.codes = ["ORDER_PRINT_PAGE_COUNT_INVALID"];
//     error.meta = { orderPageCount };
//     throw error;
//   }

//   await convertToPdf(approvalDocxPath, pdfDir);
//   const approvalPdfPath = buildPdfPath(approvalDocxPath, pdfDir);

//   const approvalLayout = await validateLayout(approvalPdfPath, {
//     documentType: "order",
//     markers: {},
//   });

//   const approvalValidation =
//     await validateOrderApprovalPageCount(approvalLayout);

//   if (!approvalValidation.ok) {
//     const error = new Error("Approval page must fit on exactly one page");
//     error.codes = approvalValidation.errors;
//     error.meta = approvalValidation.meta;
//     throw error;
//   }

//   await prepareOrderPrintDocument({
//     orderDocxPath,
//     approvalDocxPath,
//     outputDocxPath: finalDocxPath,
//     orderPageCount,
//   });

//   await convertToPdf(finalDocxPath, pdfDir);
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   const finalLayout = await validateLayout(finalPdfPath, {
//     documentType: "order",
//     markers: {},
//   });

//   const finalValidation = await validateOrderFinalPrintContract({
//     orderPageCount,
//     finalPdfLayout: finalLayout,
//     mirrorMarginsEnabled: false,
//   });

//   if (!finalValidation.ok) {
//     const error = new Error("Final order print contract validation failed");
//     error.codes = finalValidation.errors;
//     error.meta = finalValidation.meta;
//     throw error;
//   }

//   return {
//     finalDocxPath,
//     finalPdfPath,
//     orderPageCount,
//     printSettings: ORDER_PRINT_SETTINGS,
//     validation: finalValidation,
//   };
// };

// module.exports = generateOrderPrintReadyDocument;
