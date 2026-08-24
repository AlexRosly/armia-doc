const {
  normalizeOrderPrintSettings,
} = require("./orderPrintSettings");

const prepareStandaloneOrderDocument = ({
  orderBuffer,
  printSettings,
}) => {
  if (!orderBuffer) {
    throw new Error("prepareStandaloneOrderDocument: orderBuffer is required");
  }

  return {
    // Exactly like the report path: the template and pagination fixes are the
    // source of truth. Do not rewrite section margins or docGrid after that.
    buffer: orderBuffer,
    printSettings: normalizeOrderPrintSettings(printSettings),
    meta: {
      mode: "standalone_order_same_bytes",
      outputArtifactType: "validated_order_only_docx",
      printArtifactType: "assembled_print_pdf",
      wordCompatibility: {
        applied: false,
        reason: "standalone-order-does-not-require-merged-word-fixes",
      },
    },
  };
};

module.exports = prepareStandaloneOrderDocument;
