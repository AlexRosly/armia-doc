// const ORDER_PRINT_SETTINGS = {
//   printMode: "hybrid_last_two_duplex",
//   insertBlankPages: true,
//   blankPageStrategy: "after_each_order_page_except_last",
//   approvalPagePlacement: "back_of_last_order_sheet",
//   finalDuplexPageCount: 2,
//   printerDuplexMode: "long_edge",
//   outputMode: "single_word_with_blank_pages",
//   countBlankPagesInNumbering: false,
//   mirrorMargins: false,
// };

// module.exports = ORDER_PRINT_SETTINGS;
// const ORDER_PRINT_SETTINGS = {
//   printMode: "hybrid_last_two_duplex",
//   insertBlankPages: true,
//   blankPageStrategy: "after_each_order_page_except_last",
//   approvalPagePlacement: "back_of_last_order_sheet",
//   finalDuplexPageCount: 2,
//   printerDuplexMode: "long_edge",
//   outputMode: "assembled_print_pdf",
//   countBlankPagesInNumbering: false,
//   mirrorMargins: false,
// };

// const normalizeOrderPrintSettings = (input = {}) => ({
//   ...ORDER_PRINT_SETTINGS,
//   requestedPrintMode: input?.printMode || null,
//   requestedHybridPrint: input?.hybridPrint || null,
// });

// module.exports = ORDER_PRINT_SETTINGS;
// module.exports.ORDER_PRINT_SETTINGS = ORDER_PRINT_SETTINGS;
// module.exports.normalizeOrderPrintSettings = normalizeOrderPrintSettings;
const ORDER_PRINT_SETTINGS = {
  printMode: "hybrid_last_two_duplex",
  insertBlankPages: true,
  blankPageStrategy: "after_each_order_page_except_last",
  approvalPagePlacement: "back_of_last_order_sheet",
  finalDuplexPageCount: 2,
  printerDuplexMode: "long_edge",
  outputMode: "assembled_print_pdf",
  countBlankPagesInNumbering: false,
  mirrorMargins: false,
};

const normalizeOrderPrintSettings = (input = {}) => ({
  ...ORDER_PRINT_SETTINGS,
  requestedPrintMode: input?.printMode || null,
  requestedHybridPrint: input?.hybridPrint || null,
});

module.exports = {
  ORDER_PRINT_SETTINGS,
  normalizeOrderPrintSettings,
};
