const ORDER_PRINT_SETTINGS = {
  printMode: "hybrid_last_two_duplex",
  insertBlankPages: true,
  blankPageStrategy: "after_each_order_page_except_last",
  approvalPagePlacement: "back_of_last_order_sheet",
  finalDuplexPageCount: 2,
  printerDuplexMode: "long_edge",
  outputMode: "single_word_with_blank_pages",
  countBlankPagesInNumbering: false,
  mirrorMargins: false,
};

module.exports = ORDER_PRINT_SETTINGS;
