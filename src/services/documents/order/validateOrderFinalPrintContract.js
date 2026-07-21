const { getBlankPageCount, getPhysicalPageCount } = require("./orderPrintMath");
const ORDER_PRINT_ERRORS = require("./orderPrintErrors");

const validateOrderFinalPrintContract = async ({
  orderPageCount,
  finalPdfLayout,
  mirrorMarginsEnabled,
}) => {
  const errors = [];

  if (mirrorMarginsEnabled) {
    errors.push(ORDER_PRINT_ERRORS.MIRROR_MARGINS_ENABLED);
  }

  const expectedBlankPageCount = getBlankPageCount(orderPageCount);
  const expectedPhysicalPageCount = getPhysicalPageCount(orderPageCount);

  const actualPhysicalPageCount = Array.isArray(finalPdfLayout?.pages)
    ? finalPdfLayout.pages.length
    : 0;

  if (actualPhysicalPageCount !== expectedPhysicalPageCount) {
    errors.push(ORDER_PRINT_ERRORS.PAGE_COUNT_INVALID);
  }

  return {
    ok: errors.length === 0,
    errors,
    meta: {
      orderPageCount,
      expectedBlankPageCount,
      expectedPhysicalPageCount,
      actualPhysicalPageCount,
    },
  };
};

module.exports = validateOrderFinalPrintContract;
