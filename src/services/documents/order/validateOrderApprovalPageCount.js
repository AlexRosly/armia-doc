const ORDER_PRINT_ERRORS = require("./orderPrintErrors");

const validateOrderApprovalPageCount = async (approvalLayoutResult) => {
  const pageCount = Array.isArray(approvalLayoutResult?.pages)
    ? approvalLayoutResult.pages.length
    : 0;

  if (pageCount !== 1) {
    return {
      ok: false,
      errors: [ORDER_PRINT_ERRORS.PAGE_COUNT_INVALID],
      meta: {
        approvalPageCount: pageCount,
      },
    };
  }

  return {
    ok: true,
    errors: [],
    meta: {
      approvalPageCount: pageCount,
    },
  };
};

module.exports = validateOrderApprovalPageCount;
