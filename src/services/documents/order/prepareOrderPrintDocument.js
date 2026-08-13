// const { mergeDocuments } = require("../../word");
// const ORDER_PRINT_SETTINGS = require("./orderPrintSettings");

// const prepareOrderPrintDocument = async ({
//   orderBuffer,
//   approvalBuffer,
//   printSettings = ORDER_PRINT_SETTINGS,
// }) => {
//   if (!orderBuffer) {
//     throw new Error("prepareOrderPrintDocument: orderBuffer is required");
//   }

//   if (!approvalBuffer) {
//     throw new Error("prepareOrderPrintDocument: approvalBuffer is required");
//   }

//   if (printSettings.mirrorMargins !== false) {
//     throw new Error("Order print mode must not use mirror margins");
//   }

//   const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer], {
//     insertPageBreak: true,
//   });

//   return {
//     buffer: mergedBuffer,
//     printSettings,
//     meta: {
//       mode: "merge_order_and_approval_only",
//       blankPagesInserted: false,
//       outputArtifactType: "merged_docx_for_document_flow",
//       printArtifactType: "assembled_print_pdf",
//     },
//   };
// };

// module.exports = prepareOrderPrintDocument;
// const { mergeDocuments } = require("../../word");
// const ORDER_PRINT_SETTINGS = require("./orderPrintSettings");

// const prepareOrderPrintDocument = async ({
//   orderBuffer,
//   approvalBuffer,
//   printSettings = ORDER_PRINT_SETTINGS,
// }) => {
//   if (!orderBuffer) {
//     throw new Error("prepareOrderPrintDocument: orderBuffer is required");
//   }

//   if (!approvalBuffer) {
//     throw new Error("prepareOrderPrintDocument: approvalBuffer is required");
//   }

//   if (printSettings.mirrorMargins !== false) {
//     throw new Error("Order print mode must not use mirror margins");
//   }

//   const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer]);

//   return {
//     buffer: mergedBuffer,
//     printSettings,
//     meta: {
//       mode: "merge_order_and_approval_only",
//       blankPagesInserted: false,
//       outputArtifactType: "merged_docx_for_document_flow",
//       printArtifactType: "assembled_print_pdf",
//     },
//   };
// };

// module.exports = prepareOrderPrintDocument;
// const { mergeDocuments } = require("../../word");
// const ORDER_PRINT_SETTINGS = require("./orderPrintSettings");
// const PizZip = require("pizzip");

// const inspectDocxBuffer = (buffer, label) => {
//   const zip = new PizZip(buffer);
//   const names = Object.keys(zip.files).sort();

//   const headers = names.filter((n) => /^word\/header\d+\.xml$/.test(n));
//   const footers = names.filter((n) => /^word\/footer\d+\.xml$/.test(n));

//   const documentXml = zip.file("word/document.xml")?.asText() || "";
//   const relsXml = zip.file("word/_rels/document.xml.rels")?.asText() || "";

//   console.log(`\n===== ${label} =====`);
//   console.log("headers:", headers.length ? headers : "NONE");
//   console.log("footers:", footers.length ? footers : "NONE");
//   console.log(
//     "header refs in document.xml:",
//     (documentXml.match(/<w:headerReference\b/g) || []).length,
//   );
//   console.log(
//     "footer refs in document.xml:",
//     (documentXml.match(/<w:footerReference\b/g) || []).length,
//   );
//   console.log(
//     "header rels in document.xml.rels:",
//     (relsXml.match(/relationships\/header/g) || []).length,
//   );
//   console.log(
//     "footer rels in document.xml.rels:",
//     (relsXml.match(/relationships\/footer/g) || []).length,
//   );
// };

// const prepareOrderPrintDocument = async ({
//   orderBuffer,
//   approvalBuffer,
//   printSettings = ORDER_PRINT_SETTINGS,
// }) => {
//   if (!orderBuffer) {
//     throw new Error("prepareOrderPrintDocument: orderBuffer is required");
//   }

//   if (!approvalBuffer) {
//     throw new Error("prepareOrderPrintDocument: approvalBuffer is required");
//   }

//   if (printSettings.mirrorMargins !== false) {
//     throw new Error("Order print mode must not use mirror margins");
//   }

//   inspectDocxBuffer(orderBuffer, "ORDER BUFFER BEFORE MERGE");
//   inspectDocxBuffer(approvalBuffer, "APPROVAL BUFFER BEFORE MERGE");

//   const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer]);

//   inspectDocxBuffer(mergedBuffer, "MERGED BUFFER AFTER MERGE");

//   return {
//     buffer: mergedBuffer,
//     printSettings,
//     meta: {
//       mode: "merge_order_and_approval_only",
//       blankPagesInserted: false,
//       outputArtifactType: "merged_docx_for_document_flow",
//       printArtifactType: "assembled_print_pdf",
//     },
//   };
// };

// module.exports = prepareOrderPrintDocument;
const { mergeDocuments } = require("../../word");
const PizZip = require("pizzip");
const {
  ORDER_PRINT_SETTINGS,
  normalizeOrderPrintSettings,
} = require("./orderPrintSettings");

const inspectDocxBuffer = (buffer, label) => {
  const zip = new PizZip(buffer);
  const names = Object.keys(zip.files).sort();

  const headers = names.filter((n) => /^word\/header\d+\.xml$/.test(n));
  const footers = names.filter((n) => /^word\/footer\d+\.xml$/.test(n));

  const documentXml = zip.file("word/document.xml")?.asText() || "";
  const relsXml = zip.file("word/_rels/document.xml.rels")?.asText() || "";

  console.log(`\n===== ${label} =====`);
  console.log("headers:", headers.length ? headers : "NONE");
  console.log("footers:", footers.length ? footers : "NONE");
  console.log(
    "header refs in document.xml:",
    (documentXml.match(/<w:headerReference\b/g) || []).length,
  );
  console.log(
    "footer refs in document.xml:",
    (documentXml.match(/<w:footerReference\b/g) || []).length,
  );
  console.log(
    "header rels in document.xml.rels:",
    (relsXml.match(/relationships\/header/g) || []).length,
  );
  console.log(
    "footer rels in document.xml.rels:",
    (relsXml.match(/relationships\/footer/g) || []).length,
  );
};

const prepareOrderPrintDocument = async ({
  orderBuffer,
  approvalBuffer,
  printSettings,
}) => {
  if (!orderBuffer) {
    throw new Error("prepareOrderPrintDocument: orderBuffer is required");
  }

  if (!approvalBuffer) {
    throw new Error("prepareOrderPrintDocument: approvalBuffer is required");
  }

  const resolvedPrintSettings = normalizeOrderPrintSettings(printSettings);

  if (resolvedPrintSettings.mirrorMargins !== false) {
    throw new Error("Order print mode must not use mirror margins");
  }

  console.log("[prepareOrderPrintDocument] requested print settings:", {
    printMode: printSettings?.printMode || null,
    hybridPrint: printSettings?.hybridPrint || null,
  });

  console.log("[prepareOrderPrintDocument] resolved print settings:", {
    ...resolvedPrintSettings,
  });

  inspectDocxBuffer(orderBuffer, "ORDER BUFFER BEFORE MERGE");
  inspectDocxBuffer(approvalBuffer, "APPROVAL BUFFER BEFORE MERGE");

  const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer]);

  inspectDocxBuffer(mergedBuffer, "MERGED BUFFER AFTER MERGE");

  return {
    buffer: mergedBuffer,
    printSettings: resolvedPrintSettings,
    meta: {
      mode: "merge_order_and_approval_only",
      blankPagesInserted: false,
      outputArtifactType: "merged_docx_for_document_flow",
      printArtifactType: "assembled_print_pdf",
      requestedPrintMode: printSettings?.printMode || null,
      resolvedPrintMode: ORDER_PRINT_SETTINGS.printMode,
      blankPageStrategy: ORDER_PRINT_SETTINGS.blankPageStrategy,
    },
  };
};

module.exports = prepareOrderPrintDocument;
