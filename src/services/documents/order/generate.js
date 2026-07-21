// const fs = require("fs/promises");
// const buildOrderTemplateData = require("./buildTemplateDataOrder");
// const buildApprovalTemplateData = require("./buildTemplateDataApproval");
// const { generateSingleTemplate } = require("../shared");
// const { mergeDocuments } = require("../../word");

// const generateOrderDocument = async (payload, outputPath, profile) => {
//   if (!profile?.orderProfile?.template) {
//     throw new Error("profile.orderProfile.template is required");
//   }

//   if (!profile?.approvalProfile?.template) {
//     throw new Error("profile.approvalProfile.template is required");
//   }

//   const orderData = buildOrderTemplateData(payload);
//   const approvalData = buildApprovalTemplateData(payload);

//   const orderBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "order",
//     template: profile.orderProfile.template,
//     data: orderData,
//   });

//   const approvalBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "approval",
//     template: profile.approvalProfile.template,
//     data: approvalData,
//   });

//   const mergedBuffer = mergeDocuments([orderBuffer, approvalBuffer], {
//     insertPageBreak: true,
//   });

//   await fs.writeFile(outputPath, mergedBuffer);

//   return outputPath;
// };

// module.exports = generateOrderDocument;

// const fs = require("fs/promises");
// const path = require("path");
// const buildOrderTemplateData = require("./buildTemplateDataOrder");
// const buildApprovalTemplateData = require("./buildTemplateDataApproval");
// const { generateSingleTemplate } = require("../shared");
// const prepareOrderPrintDocument = require("./prepareOrderPrintDocument");
// const validateGeneratedOrderDocument = require("./validateGeneratedOrderDocument");
// const generateOrderBlankPageBuffer = require("./generateOrderBlankPageBuffer");
// const validateOrderBlankPageDocument = require("./validateOrderBlankPageDocument");

// const ORDER_PRINT_APPEND_TEST_BLANK =
//   process.env.ORDER_PRINT_APPEND_TEST_BLANK === "1";

// console.log(
//   "[order] ORDER_PRINT_APPEND_TEST_BLANK raw:",
//   process.env.ORDER_PRINT_APPEND_TEST_BLANK,
// );
// console.log(
//   "[order] ORDER_PRINT_APPEND_TEST_BLANK parsed:",
//   ORDER_PRINT_APPEND_TEST_BLANK,
// );

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const buildTempBlankDocxPath = (outputPath) =>
//   outputPath.replace(/\.docx$/i, ".blank-preview.docx");

// const generateOrderDocument = async (payload, outputPath, profile) => {
//   if (!profile?.orderProfile?.template) {
//     throw new Error("profile.orderProfile.template is required");
//   }

//   if (!profile?.approvalProfile?.template) {
//     throw new Error("profile.approvalProfile.template is required");
//   }

//   const orderData = buildOrderTemplateData(payload);
//   const approvalData = buildApprovalTemplateData(payload);

//   const orderBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "order",
//     template: profile.orderProfile.template,
//     data: orderData,
//   });

//   const approvalBuffer = await generateSingleTemplate({
//     documentType: "order",
//     templateSubfolder: "approval",
//     template: profile.approvalProfile.template,
//     data: approvalData,
//   });

//   let blankPageBuffer = null;

//   if (ORDER_PRINT_APPEND_TEST_BLANK) {
//     blankPageBuffer = await generateOrderBlankPageBuffer();

//     const tempBlankDocxPath = buildTempBlankDocxPath(outputPath);
//     await fs.writeFile(tempBlankDocxPath, blankPageBuffer);

//     const blankValidation = await validateOrderBlankPageDocument({
//       docxPath: tempBlankDocxPath,
//       pdfDir: buildPdfDir(),
//       buildPdfPath,
//     });

//     if (!blankValidation.ok) {
//       const error = new Error("Order blank page validation failed");
//       error.codes = blankValidation.errors;
//       error.meta = blankValidation.meta;
//       throw error;
//     }

//     console.log("[order] blank page validation:", blankValidation.meta);
//   }

//   const prepared = await prepareOrderPrintDocument({
//     orderBuffer,
//     approvalBuffer,
//     blankPageBuffer,
//   });

//   await fs.writeFile(outputPath, prepared.buffer);

//   const validation = await validateGeneratedOrderDocument({
//     docxPath: outputPath,
//     pdfDir: buildPdfDir(),
//     buildPdfPath,
//     assemblyMeta: prepared.meta,
//   });

//   if (!validation.ok) {
//     const error = new Error("Generated order document validation failed");
//     error.codes = validation.errors;
//     error.meta = validation.meta;
//     throw error;
//   }

//   console.log("[order] print settings:", prepared.printSettings);
//   console.log("[order] prepare meta:", prepared.meta);
//   console.log("[order] generated document validation:", validation.meta);

//   return outputPath;
// };

// module.exports = generateOrderDocument;

// const fs = require("fs/promises");
// const path = require("path");

// const buildOrderTemplateData = require("./buildTemplateDataOrder");
// const buildApprovalTemplateData = require("./buildTemplateDataApproval");

// const { generateSingleTemplate } = require("../shared");
// const prepareOrderPrintDocument = require("./prepareOrderPrintDocument");
// const validateGeneratedOrderDocument = require("./validateGeneratedOrderDocument");

// const { convertToPdf } = require("../../pdf");
// const assembleOrderPrintPdf = require("./assembleOrderPrintPdf");
// const validateAssembledOrderPrintPdf = require("./validateAssembledOrderPrintPdf");
// const safeUnlink = require("./safeUnlink");

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const buildFinalPublicPdfPath = (outputPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(outputPath).name}.pdf`);

// const buildFinalAssembledTempPdfPath = (outputPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(outputPath).name}.assembled.pdf`);

// const buildOrderOnlyDocxPath = (outputPath) =>
//   outputPath.replace(/\.docx$/i, ".order-only.docx");

// const buildApprovalOnlyDocxPath = (outputPath) =>
//   outputPath.replace(/\.docx$/i, ".approval-only.docx");

// const buildMergedValidationPdfPath = (outputPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(outputPath).name}.merged-preview.pdf`);

// const buildAssemblerPrintSettings = (preparedPrintSettings = {}) => ({
//   insertBlankPages: preparedPrintSettings.insertBlankPages,
//   blankPageStrategy: preparedPrintSettings.blankPageStrategy,
//   approvalPagePlacement: preparedPrintSettings.approvalPagePlacement,
//   debugBlankPages: false,
// });

// const generateOrderDocument = async (payload, outputPath, profile) => {
//   if (!profile?.orderProfile?.template) {
//     throw new Error("profile.orderProfile.template is required");
//   }

//   if (!profile?.approvalProfile?.template) {
//     throw new Error("profile.approvalProfile.template is required");
//   }

//   const pdfDir = buildPdfDir();

//   const orderOnlyDocxPath = buildOrderOnlyDocxPath(outputPath);
//   const approvalOnlyDocxPath = buildApprovalOnlyDocxPath(outputPath);

//   const orderOnlyPdfPath = buildPdfPath(orderOnlyDocxPath, pdfDir);
//   const approvalOnlyPdfPath = buildPdfPath(approvalOnlyDocxPath, pdfDir);

//   const finalPdfPath = buildFinalPublicPdfPath(outputPath, pdfDir);
//   const assembledTempPdfPath = buildFinalAssembledTempPdfPath(
//     outputPath,
//     pdfDir,
//   );

//   const mergedValidationPdfPath = buildMergedValidationPdfPath(
//     outputPath,
//     pdfDir,
//   );

//   try {
//     await safeUnlink(finalPdfPath);
//     await safeUnlink(assembledTempPdfPath);
//     await safeUnlink(mergedValidationPdfPath);

//     const orderData = buildOrderTemplateData(payload);
//     const approvalData = buildApprovalTemplateData(payload);

//     const orderBuffer = await generateSingleTemplate({
//       documentType: "order",
//       templateSubfolder: "order",
//       template: profile.orderProfile.template,
//       data: orderData,
//     });

//     const approvalBuffer = await generateSingleTemplate({
//       documentType: "order",
//       templateSubfolder: "approval",
//       template: profile.approvalProfile.template,
//       data: approvalData,
//     });

//     await fs.writeFile(orderOnlyDocxPath, orderBuffer);
//     await fs.writeFile(approvalOnlyDocxPath, approvalBuffer);

//     await convertToPdf(orderOnlyDocxPath, pdfDir);
//     await convertToPdf(approvalOnlyDocxPath, pdfDir);

//     const prepared = await prepareOrderPrintDocument({
//       orderBuffer,
//       approvalBuffer,
//     });

//     await fs.writeFile(outputPath, prepared.buffer);

//     const mergedDocxValidation = await validateGeneratedOrderDocument({
//       docxPath: outputPath,
//       pdfDir,
//       buildPdfPath: (docxPath) =>
//         buildMergedValidationPdfPath(docxPath, pdfDir),
//       assemblyMeta: prepared.meta,
//     });

//     if (!mergedDocxValidation.ok) {
//       const error = new Error("Generated merged DOCX validation failed");
//       error.codes = mergedDocxValidation.errors;
//       error.meta = mergedDocxValidation.meta;
//       throw error;
//     }

//     console.log(
//       "[order] generated merged docx validation:",
//       mergedDocxValidation.meta,
//     );

//     const assemblerPrintSettings = buildAssemblerPrintSettings(
//       prepared.printSettings,
//     );

//     console.log("[order] assembler print settings:", assemblerPrintSettings);

//     const printPdfMeta = await assembleOrderPrintPdf({
//       orderPdfPath: orderOnlyPdfPath,
//       approvalPdfPath: approvalOnlyPdfPath,
//       outputPdfPath: assembledTempPdfPath,
//       printSettings: assemblerPrintSettings,
//     });

//     console.log("[order] assembled final pdf:", {
//       ...printPdfMeta,
//       outputPdfPath: assembledTempPdfPath,
//     });

//     const printPdfValidation = await validateAssembledOrderPrintPdf({
//       pdfPath: assembledTempPdfPath,
//       expectedOrderPageCount: printPdfMeta.orderPageCount,
//       expectedApprovalPageCount: printPdfMeta.approvalPageCount,
//     });

//     if (!printPdfValidation.ok) {
//       const error = new Error("Final assembled PDF validation failed");
//       error.codes = printPdfValidation.errors;
//       error.meta = printPdfValidation.meta;
//       throw error;
//     }

//     await safeUnlink(finalPdfPath);
//     await fs.rename(assembledTempPdfPath, finalPdfPath);

//     console.log("[order] validated final pdf:", {
//       ...printPdfValidation.meta,
//       pdfPath: finalPdfPath,
//     });
//     console.log("[order] prepare meta:", prepared.meta);
//     console.log("[order] print settings:", prepared.printSettings);

//     return {
//       docxPath: outputPath,
//       pdfPath: finalPdfPath,
//       pdfMeta: {
//         ...printPdfMeta,
//         outputPdfPath: finalPdfPath,
//       },
//       pdfValidation: {
//         ...printPdfValidation.meta,
//         pdfPath: finalPdfPath,
//       },
//       mergedDocxValidation: mergedDocxValidation.meta,
//       preparedPrintSettings: prepared.printSettings,
//       assemblerPrintSettings,
//     };
//   } finally {
//     await Promise.all([
//       safeUnlink(orderOnlyDocxPath),
//       safeUnlink(approvalOnlyDocxPath),
//       safeUnlink(orderOnlyPdfPath),
//       safeUnlink(approvalOnlyPdfPath),
//       safeUnlink(mergedValidationPdfPath),
//       safeUnlink(assembledTempPdfPath),
//     ]);
//   }
// };

// module.exports = generateOrderDocument;
const fs = require("fs/promises");
const path = require("path");

const prepareOrderPrintDocument = require("./prepareOrderPrintDocument");
const validateGeneratedOrderDocument = require("./validateGeneratedOrderDocument");
const assembleOrderPrintPdf = require("./assembleOrderPrintPdf");
const validateAssembledOrderPrintPdf = require("./validateAssembledOrderPrintPdf");
const safeUnlink = require("./safeUnlink");

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

const buildFinalPublicPdfPath = (outputPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(outputPath).name}.pdf`);

const buildFinalAssembledTempPdfPath = (outputPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(outputPath).name}.assembled.pdf`);

const buildMergedValidationPdfPath = (outputPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(outputPath).name}.merged-preview.pdf`);

const buildAssemblerPrintSettings = (preparedPrintSettings = {}) => ({
  insertBlankPages: preparedPrintSettings.insertBlankPages,
  blankPageStrategy: preparedPrintSettings.blankPageStrategy,
  approvalPagePlacement: preparedPrintSettings.approvalPagePlacement,
  debugBlankPages: false,
});

const generateOrderDocument = async ({
  payload,
  outputPath,
  profile,
  orderSource,
  approvalSource,
}) => {
  if (!profile?.orderProfile?.template) {
    throw new Error("profile.orderProfile.template is required");
  }

  if (!profile?.approvalProfile?.template) {
    throw new Error("profile.approvalProfile.template is required");
  }

  if (!orderSource?.docxPath || !orderSource?.pdfPath) {
    throw new Error(
      "orderSource.docxPath and orderSource.pdfPath are required",
    );
  }

  if (!approvalSource?.docxPath || !approvalSource?.pdfPath) {
    throw new Error(
      "approvalSource.docxPath and approvalSource.pdfPath are required",
    );
  }

  const pdfDir = buildPdfDir();
  const finalPdfPath = buildFinalPublicPdfPath(outputPath, pdfDir);
  const assembledTempPdfPath = buildFinalAssembledTempPdfPath(
    outputPath,
    pdfDir,
  );
  const mergedValidationPdfPath = buildMergedValidationPdfPath(
    outputPath,
    pdfDir,
  );

  try {
    await safeUnlink(finalPdfPath);
    await safeUnlink(assembledTempPdfPath);
    await safeUnlink(mergedValidationPdfPath);

    const [orderBuffer, approvalBuffer] = await Promise.all([
      fs.readFile(orderSource.docxPath),
      fs.readFile(approvalSource.docxPath),
    ]);

    const prepared = await prepareOrderPrintDocument({
      orderBuffer,
      approvalBuffer,
    });

    await fs.writeFile(outputPath, prepared.buffer);

    const mergedDocxValidation = await validateGeneratedOrderDocument({
      docxPath: outputPath,
      pdfDir,
      buildPdfPath: (docxPath) =>
        buildMergedValidationPdfPath(docxPath, pdfDir),
      assemblyMeta: prepared.meta,
    });

    if (!mergedDocxValidation.ok) {
      const error = new Error("Generated merged DOCX validation failed");
      error.codes = mergedDocxValidation.errors;
      error.meta = mergedDocxValidation.meta;
      throw error;
    }

    // console.log(
    //   "[order] generated merged docx validation:",
    //   mergedDocxValidation.meta,
    // );

    const assemblerPrintSettings = buildAssemblerPrintSettings(
      prepared.printSettings,
    );

    // console.log("[order] assembler print settings:", assemblerPrintSettings);

    const printPdfMeta = await assembleOrderPrintPdf({
      orderPdfPath: orderSource.pdfPath,
      approvalPdfPath: approvalSource.pdfPath,
      outputPdfPath: assembledTempPdfPath,
      printSettings: assemblerPrintSettings,
    });

    // console.log("[order] assembled final pdf:", {
    //   ...printPdfMeta,
    //   outputPdfPath: assembledTempPdfPath,
    // });

    const printPdfValidation = await validateAssembledOrderPrintPdf({
      pdfPath: assembledTempPdfPath,
      expectedOrderPageCount: printPdfMeta.orderPageCount,
      expectedApprovalPageCount: printPdfMeta.approvalPageCount,
    });

    if (!printPdfValidation.ok) {
      const error = new Error("Final assembled PDF validation failed");
      error.codes = printPdfValidation.errors;
      error.meta = printPdfValidation.meta;
      throw error;
    }

    await safeUnlink(finalPdfPath);
    await fs.rename(assembledTempPdfPath, finalPdfPath);

    // console.log("[order] validated final pdf:", {
    //   ...printPdfValidation.meta,
    //   pdfPath: finalPdfPath,
    // });
    // console.log("[order] prepare meta:", prepared.meta);
    // console.log("[order] print settings:", prepared.printSettings);

    return {
      docxPath: outputPath,
      pdfPath: finalPdfPath,
      pdfMeta: {
        ...printPdfMeta,
        outputPdfPath: finalPdfPath,
      },
      pdfValidation: {
        ...printPdfValidation.meta,
        pdfPath: finalPdfPath,
      },
      mergedDocxValidation: mergedDocxValidation.meta,
      preparedPrintSettings: prepared.printSettings,
      assemblerPrintSettings,
    };
  } finally {
    await Promise.all([
      safeUnlink(mergedValidationPdfPath),
      safeUnlink(assembledTempPdfPath),
    ]);
  }
};

module.exports = generateOrderDocument;
