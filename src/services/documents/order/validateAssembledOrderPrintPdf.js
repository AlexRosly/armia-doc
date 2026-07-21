const validateLayout = require("../../layout/validateLayout");

const validateAssembledOrderPrintPdf = async ({
  pdfPath,
  expectedOrderPageCount,
  expectedApprovalPageCount = 1,
}) => {
  const layout = await validateLayout(pdfPath, {
    documentType: "order_print_pdf",
    markers: {},
  });

  const totalPageCount = Array.isArray(layout?.pages) ? layout.pages.length : 0;
  const expectedBlankPageCount = Math.max(expectedOrderPageCount - 1, 0);
  const expectedTotalPageCount =
    expectedOrderPageCount + expectedBlankPageCount + expectedApprovalPageCount;

  return {
    ok: totalPageCount === expectedTotalPageCount,
    errors:
      totalPageCount === expectedTotalPageCount
        ? []
        : [
            {
              code: "ORDER_PRINT_PDF_PAGE_COUNT_INVALID",
              expectedTotalPageCount,
              actualTotalPageCount: totalPageCount,
            },
          ],
    meta: {
      pdfPath,
      totalPageCount,
      expectedOrderPageCount,
      expectedBlankPageCount,
      expectedApprovalPageCount,
      expectedTotalPageCount,
    },
  };
};

module.exports = validateAssembledOrderPrintPdf;
