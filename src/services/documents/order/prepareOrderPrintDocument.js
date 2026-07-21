const { mergeDocuments } = require("../../word");
const ORDER_PRINT_SETTINGS = require("./orderPrintSettings");

const prepareOrderPrintDocument = async ({
  orderBuffer,
  approvalBuffer,
  printSettings = ORDER_PRINT_SETTINGS,
}) => {
  if (!orderBuffer) {
    throw new Error("prepareOrderPrintDocument: orderBuffer is required");
  }

  if (!approvalBuffer) {
    throw new Error("prepareOrderPrintDocument: approvalBuffer is required");
  }

  if (printSettings.mirrorMargins !== false) {
    throw new Error("Order print mode must not use mirror margins");
  }

  const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer], {
    insertPageBreak: true,
  });

  return {
    buffer: mergedBuffer,
    printSettings,
    meta: {
      mode: "merge_order_and_approval_only",
      blankPagesInserted: false,
      outputArtifactType: "merged_docx_for_document_flow",
      printArtifactType: "assembled_print_pdf",
    },
  };
};

module.exports = prepareOrderPrintDocument;
