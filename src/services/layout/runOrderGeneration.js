// const fs = require("fs/promises");
// const path = require("path");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");
// const order = require("../documents/order");

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job, suffix) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const buildFinalDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// const buildFinalPdfPath = (job) =>
//   path.join(process.cwd(), "storage", "pdf", `${job._id}.pdf`);

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (error) {
//     if (error.code !== "ENOENT") {
//       console.warn(`[runOrderGeneration] cleanup failed: ${filePath}`);
//       console.warn(error.message);
//     }
//   }
// };

// const cleanupArtifacts = async (paths) => {
//   for (const filePath of paths) {
//     await cleanupFileIfExists(filePath);
//   }
// };

// const buildValidationContext = (payload, label) => {
//   if (label === "order") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "order",
//       markers: {
//         nakazuiu: "НАКАЗУЮ:",
//         signerPosition: signer.position,
//         signerRank: signer.rank,
//         signerFirstName: signer.firstName,
//         signerLastName: signer.lastName,
//       },
//     };
//   }

//   if (label === "approval") {
//     return {
//       documentType: "approval",
//       markers: {},
//     };
//   }
//   return {
//     documentType: label,
//     markers: {},
//   };
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
//   generateDocument,
//   label,
// }) => {
//   try {
//     await ensureParentDir(docxPath);
//     await generateDocument(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload, label);
//     const layoutResult = await validateLayout(pdfPath, validationContext);

//     const pages = Array.isArray(layoutResult)
//       ? layoutResult
//       : Array.isArray(layoutResult.pages)
//         ? layoutResult.pages
//         : [];

//     const hardViolations = Array.isArray(layoutResult?.hardViolations)
//       ? layoutResult.hardViolations
//       : [];

//     const hasBelowMinPage = pages.some((page) => page.status === "below_min");
//     const hasLayoutError = hasBelowMinPage || hardViolations.length > 0;

//     return {
//       ok: true,
//       label,
//       profileName,
//       profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(
//       `[runOrderGeneration] ${label} candidate failed: ${profileName}`,
//     );
//     console.error(error.message);

//     return {
//       ok: false,
//       label,
//       profileName,
//       profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runSingleSelection = async ({
//   payload,
//   job,
//   profiles,
//   label,
//   generateDocument,
// }) => {
//   if (!profiles.length) {
//     throw new Error(`No ${label} profiles configured`);
//   }

//   const docxPath = buildDocxPath(job, label);
//   const pdfDir = buildPdfDir();

//   console.log(
//     `[runOrderGeneration] selecting ${label} profile, candidates=${profiles.length}`,
//   );

//   let bestResult = null;

//   for (const profile of profiles) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile,
//       profileName: profile.name,
//       generateDocument,
//       label,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runOrderGeneration] ${label} passed with profile=${result.profileName}`,
//       );

//       return {
//         status: "passed",
//         profileName: result.profileName,
//         profile: result.profile,
//         pages: result.pages,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     bestResult = {
//       status: "best_effort",
//       profileName: result.profileName,
//       profile: result.profile,
//       pages: result.pages,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     };
//   }

//   if (bestResult) {
//     console.warn(
//       `[runOrderGeneration] ${label} fallback to best_effort profile=${bestResult.profileName}`,
//     );
//     return bestResult;
//   }

//   throw new Error(`No valid ${label} profile could be generated`);
// };

// const runOrderGeneration = async (report, job) => {
//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};

//   const finalDocxPath = buildFinalDocxPath(job);
//   const finalPdfPath = buildFinalPdfPath(job);
//   const pdfDir = buildPdfDir();

//   const tempArtifacts = [
//     buildDocxPath(job, "order"),
//     buildDocxPath(job, "approval"),
//     buildPdfPath(buildDocxPath(job, "order"), pdfDir),
//     buildPdfPath(buildDocxPath(job, "approval"), pdfDir),
//   ];

//   const orderResult = await runSingleSelection({
//     payload,
//     job,
//     profiles: orderProfiles,
//     label: "order",
//     generateDocument: order.generateOrderOnlyDocument,
//   });

//   const approvalResult = await runSingleSelection({
//     payload,
//     job,
//     profiles: approvalProfiles,
//     label: "approval",
//     generateDocument: order.generateApprovalOnlyDocument,
//   });

//   const finalProfile = {
//     orderProfile: orderResult.profile,
//     approvalProfile: approvalResult.profile,
//   };

//   await ensureParentDir(finalDocxPath);

//   console.log(
//     `[runOrderGeneration] building final merged document with order=${orderResult.profileName}, approval=${approvalResult.profileName}`,
//   );

//   await order.generateOrderDocument(payload, finalDocxPath, finalProfile);
//   await convertToPdf(finalDocxPath, pdfDir);

//   await cleanupArtifacts(tempArtifacts);

//   return {
//     status: "passed",
//     profile: {
//       orderProfile: orderResult.profileName,
//       approvalProfile: approvalResult.profileName,
//     },
//     layoutCheck: {
//       order: {
//         status: orderResult.status,
//         profile: orderResult.profileName,
//         pages: orderResult.pages,
//       },
//       approval: {
//         status: approvalResult.status,
//         profile: approvalResult.profileName,
//         pages: approvalResult.pages,
//       },
//     },
//     resolvedProfile: finalProfile,
//     outputPath: finalDocxPath,
//   };
// };

// module.exports = runOrderGeneration;

// const fs = require("fs/promises");
// const path = require("path");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");
// const order = require("../documents/order");

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job, suffix) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const buildFinalDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (error) {
//     if (error.code !== "ENOENT") {
//       console.warn(`[runOrderGeneration] cleanup failed: ${filePath}`);
//       console.warn(error.message);
//     }
//   }
// };

// const cleanupArtifacts = async (paths) => {
//   for (const filePath of paths) {
//     await cleanupFileIfExists(filePath);
//   }
// };

// const buildValidationContext = (payload, label) => {
//   if (label === "order") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "order",
//       markers: {
//         nakazuiu: "НАКАЗУЮ:",
//         signerPosition: signer.position,
//         signerRank: signer.rank,
//         signerFirstName: signer.firstName,
//         signerLastName: signer.lastName,
//       },
//     };
//   }

//   if (label === "approval") {
//     return {
//       documentType: "approval",
//       markers: {},
//     };
//   }

//   return {
//     documentType: label,
//     markers: {},
//   };
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
//   generateDocument,
//   label,
// }) => {
//   try {
//     await ensureParentDir(docxPath);
//     await generateDocument(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload, label);
//     const layoutResult = await validateLayout(pdfPath, validationContext);

//     const pages = Array.isArray(layoutResult)
//       ? layoutResult
//       : Array.isArray(layoutResult.pages)
//         ? layoutResult.pages
//         : [];

//     const hardViolations = Array.isArray(layoutResult?.hardViolations)
//       ? layoutResult.hardViolations
//       : [];

//     const hasBelowMinPage = pages.some((page) => page.status === "below_min");
//     const hasLayoutError = hasBelowMinPage || hardViolations.length > 0;

//     return {
//       ok: true,
//       label,
//       profileName,
//       profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(
//       `[runOrderGeneration] ${label} candidate failed: ${profileName}`,
//     );
//     console.error(error.message);

//     return {
//       ok: false,
//       label,
//       profileName,
//       profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runSingleSelection = async ({
//   payload,
//   job,
//   profiles,
//   label,
//   generateDocument,
// }) => {
//   if (!profiles.length) {
//     throw new Error(`No ${label} profiles configured`);
//   }

//   const docxPath = buildDocxPath(job, label);
//   const pdfDir = buildPdfDir();

//   console.log(
//     `[runOrderGeneration] selecting ${label} profile, candidates=${profiles.length}`,
//   );

//   let bestResult = null;

//   for (const profile of profiles) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile,
//       profileName: profile.name,
//       generateDocument,
//       label,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runOrderGeneration] ${label} passed with profile=${result.profileName}`,
//       );

//       return {
//         status: "passed",
//         profileName: result.profileName,
//         profile: result.profile,
//         pages: result.pages,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     bestResult = {
//       status: "best_effort",
//       profileName: result.profileName,
//       profile: result.profile,
//       pages: result.pages,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     };
//   }

//   if (bestResult) {
//     console.warn(
//       `[runOrderGeneration] ${label} fallback to best_effort profile=${bestResult.profileName}`,
//     );
//     return bestResult;
//   }

//   throw new Error(`No valid ${label} profile could be generated`);
// };

// const runOrderGeneration = async (report, job) => {
//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};

//   const finalDocxPath = buildFinalDocxPath(job);
//   const pdfDir = buildPdfDir();

//   const tempArtifacts = [
//     buildDocxPath(job, "order"),
//     buildDocxPath(job, "approval"),
//     buildPdfPath(buildDocxPath(job, "order"), pdfDir),
//     buildPdfPath(buildDocxPath(job, "approval"), pdfDir),
//   ];

//   const orderResult = await runSingleSelection({
//     payload,
//     job,
//     profiles: orderProfiles,
//     label: "order",
//     generateDocument: order.generateOrderOnlyDocument,
//   });

//   const approvalResult = await runSingleSelection({
//     payload,
//     job,
//     profiles: approvalProfiles,
//     label: "approval",
//     generateDocument: order.generateApprovalOnlyDocument,
//   });

//   const finalProfile = {
//     orderProfile: orderResult.profile,
//     approvalProfile: approvalResult.profile,
//   };

//   await ensureParentDir(finalDocxPath);

//   console.log(
//     `[runOrderGeneration] building final merged document with order=${orderResult.profileName}, approval=${approvalResult.profileName}`,
//   );

//   const generationResult = await order.generateOrderDocument(
//     payload,
//     finalDocxPath,
//     finalProfile,
//   );

//   await cleanupArtifacts(tempArtifacts);

//   return {
//     status: "passed",
//     profile: {
//       orderProfile: orderResult.profileName,
//       approvalProfile: approvalResult.profileName,
//     },
//     layoutCheck: {
//       order: {
//         status: orderResult.status,
//         profile: orderResult.profileName,
//         pages: orderResult.pages,
//       },
//       approval: {
//         status: approvalResult.status,
//         profile: approvalResult.profileName,
//         pages: approvalResult.pages,
//       },
//     },
//     resolvedProfile: finalProfile,
//     outputPath: generationResult.pdfPath,
//     pdfPath: generationResult.pdfPath,
//     docxPath: finalDocxPath,
//     generationResult,
//   };
// };

// module.exports = runOrderGeneration;
// const fs = require("fs/promises");
// const path = require("path");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");
// const order = require("../documents/order");
// ///////////////////
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
// /////////////////////////
// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job, suffix) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const buildFinalDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_nakaz.docx`);

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (error) {
//     if (error.code !== "ENOENT") {
//       console.warn(`[runOrderGeneration] cleanup failed: ${filePath}`);
//       console.warn(error.message);
//     }
//   }
// };

// const cleanupArtifacts = async (paths) => {
//   for (const filePath of paths) {
//     await cleanupFileIfExists(filePath);
//   }
// };

// const buildValidationContext = (payload, label) => {
//   if (label === "order") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "order",
//       markers: {
//         nakazuiu: "НАКАЗУЮ:",
//         signerPosition: signer.position,
//         signerRank: signer.rank,
//         signerFirstName: signer.firstName,
//         signerLastName: signer.lastName,
//       },
//     };
//   }

//   if (label === "approval") {
//     return {
//       documentType: "approval",
//       markers: {},
//     };
//   }

//   return {
//     documentType: label,
//     markers: {},
//   };
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
//   generateDocument,
//   label,
// }) => {
//   try {
//     await ensureParentDir(docxPath);
//     await generateDocument(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload, label);
//     const layoutResult = await validateLayout(pdfPath, validationContext);

//     const pages = Array.isArray(layoutResult)
//       ? layoutResult
//       : Array.isArray(layoutResult.pages)
//         ? layoutResult.pages
//         : [];

//     const hardViolations = Array.isArray(layoutResult?.hardViolations)
//       ? layoutResult.hardViolations
//       : [];

//     const hasBelowMinPage = pages.some((page) => page.status === "below_min");
//     const hasLayoutError = hasBelowMinPage || hardViolations.length > 0;

//     return {
//       ok: true,
//       label,
//       profileName,
//       profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(
//       `[runOrderGeneration] ${label} candidate failed: ${profileName}`,
//     );
//     console.error(error.message);

//     return {
//       ok: false,
//       label,
//       profileName,
//       profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runSingleSelection = async ({
//   payload,
//   job,
//   profiles,
//   label,
//   generateDocument,
// }) => {
//   if (!profiles.length) {
//     throw new Error(`No ${label} profiles configured`);
//   }

//   const docxPath = buildDocxPath(job, label);
//   const pdfDir = buildPdfDir();

//   // console.log(
//   //   `[runOrderGeneration] selecting ${label} profile, candidates=${profiles.length}`,
//   // );

//   let bestResult = null;

//   for (const profile of profiles) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile,
//       profileName: profile.name,
//       generateDocument,
//       label,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runOrderGeneration] ${label} passed with profile=${result.profileName}`,
//       );

//       return {
//         status: "passed",
//         profileName: result.profileName,
//         profile: result.profile,
//         pages: result.pages,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     bestResult = {
//       status: "best_effort",
//       profileName: result.profileName,
//       profile: result.profile,
//       pages: result.pages,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     };
//   }

//   if (bestResult) {
//     console.warn(
//       `[runOrderGeneration] ${label} fallback to best_effort profile=${bestResult.profileName}`,
//     );
//     return bestResult;
//   }

//   throw new Error(`No valid ${label} profile could be generated`);
// };

// const runOrderGeneration = async (report, job) => {
//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};

//   const finalDocxPath = buildFinalDocxPath(job);
//   const pdfDir = buildPdfDir();

//   const tempArtifacts = [
//     buildDocxPath(job, "order"),
//     buildDocxPath(job, "approval"),
//     buildPdfPath(buildDocxPath(job, "order"), pdfDir),
//     buildPdfPath(buildDocxPath(job, "approval"), pdfDir),
//   ];

//   const orderResult = await runSingleSelection({
//     payload,
//     job,
//     profiles: orderProfiles,
//     label: "order",
//     generateDocument: order.generateOrderOnlyDocument,
//   });

//   const approvalResult = await runSingleSelection({
//     payload,
//     job,
//     profiles: approvalProfiles,
//     label: "approval",
//     generateDocument: order.generateApprovalOnlyDocument,
//   });

//   const finalProfile = {
//     orderProfile: orderResult.profile,
//     approvalProfile: approvalResult.profile,
//   };

//   await ensureParentDir(finalDocxPath);

//   // console.log(
//   //   `[runOrderGeneration] building final merged document with order=${orderResult.profileName}, approval=${approvalResult.profileName}`,
//   // );

//   const generationResult = await order.generateOrderDocument({
//     payload,
//     outputPath: finalDocxPath,
//     profile: finalProfile,
//     orderSource: {
//       docxPath: orderResult.docxPath,
//       pdfPath: orderResult.pdfPath,
//     },
//     approvalSource: {
//       docxPath: approvalResult.docxPath,
//       pdfPath: approvalResult.pdfPath,
//     },
//   });

//   await cleanupArtifacts(tempArtifacts);

//   return {
//     status: "passed",
//     profile: {
//       orderProfile: orderResult.profileName,
//       approvalProfile: approvalResult.profileName,
//     },
//     layoutCheck: {
//       order: {
//         status: orderResult.status,
//         profile: orderResult.profileName,
//         pages: orderResult.pages,
//       },
//       approval: {
//         status: approvalResult.status,
//         profile: approvalResult.profileName,
//         pages: approvalResult.pages,
//       },
//     },
//     resolvedProfile: finalProfile,
//     outputPath: generationResult.pdfPath,
//     pdfPath: generationResult.pdfPath,
//     docxPath: finalDocxPath,
//     generationResult,
//   };
// };

// module.exports = runOrderGeneration;
const fs = require("fs/promises");
const path = require("path");
const { convertToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const validateLayout = require("./validateLayout");
const documents = require("../documents");
const order = require("../documents/order");

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildDocxPath = (job, suffix) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const buildFinalDocxPath = (job) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}_nakaz.docx`);

const ensureParentDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const cleanupFileIfExists = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`[runOrderGeneration] cleanup failed: ${filePath}`);
      console.warn(error.message);
    }
  }
};

const cleanupArtifacts = async (paths) => {
  for (const filePath of paths) {
    await cleanupFileIfExists(filePath);
  }
};

const buildValidationContext = (payload, label) => {
  if (label === "order") {
    const signer = payload.data?.signer || {};

    return {
      documentType: "order",
      markers: {
        nakazuiu: "НАКАЗУЮ:",
        signerPosition: signer.position,
        signerRank: signer.rank,
        signerFirstName: signer.firstName,
        signerLastName: signer.lastName,
      },
    };
  }

  if (label === "approval") {
    return {
      documentType: "approval",
      markers: {},
    };
  }

  return {
    documentType: label,
    markers: {},
  };
};

const evaluateCandidate = async ({
  payload,
  docxPath,
  pdfDir,
  profile,
  profileName,
  generateDocument,
  label,
}) => {
  try {
    await ensureParentDir(docxPath);
    await generateDocument(payload, docxPath, profile);
    await convertToPdf(docxPath, pdfDir);

    const pdfPath = buildPdfPath(docxPath, pdfDir);
    const validationContext = buildValidationContext(payload, label);
    const layoutResult = await validateLayout(pdfPath, validationContext);

    const pages = Array.isArray(layoutResult)
      ? layoutResult
      : Array.isArray(layoutResult.pages)
        ? layoutResult.pages
        : [];

    const hardViolations = Array.isArray(layoutResult?.hardViolations)
      ? layoutResult.hardViolations
      : [];

    const hasBelowMinPage = pages.some((page) => page.status === "below_min");
    const hasLayoutError = hasBelowMinPage || hardViolations.length > 0;

    return {
      ok: true,
      label,
      profileName,
      profile,
      pages,
      hardViolations,
      hasLayoutError,
      docxPath,
      pdfPath,
    };
  } catch (error) {
    console.error(
      `[runOrderGeneration] ${label} candidate failed: ${profileName}`,
    );
    console.error(error.message);

    return {
      ok: false,
      label,
      profileName,
      profile,
      pages: [],
      hardViolations: [],
      hasLayoutError: true,
      error: error.message,
      docxPath,
      pdfPath: buildPdfPath(docxPath, pdfDir),
    };
  }
};

const runSingleSelection = async ({
  payload,
  job,
  profiles,
  label,
  generateDocument,
}) => {
  if (!profiles.length) {
    throw new Error(`No ${label} profiles configured`);
  }

  const docxPath = buildDocxPath(job, label);
  const pdfDir = buildPdfDir();

  let bestResult = null;

  for (const profile of profiles) {
    const result = await evaluateCandidate({
      payload,
      docxPath,
      pdfDir,
      profile,
      profileName: profile.name,
      generateDocument,
      label,
    });

    if (!result.ok) {
      continue;
    }

    if (!result.hasLayoutError) {
      console.log(
        `[runOrderGeneration] ${label} passed with profile=${result.profileName}`,
      );

      return {
        status: "passed",
        profileName: result.profileName,
        profile: result.profile,
        pages: result.pages,
        docxPath: result.docxPath,
        pdfPath: result.pdfPath,
      };
    }

    bestResult = {
      status: "best_effort",
      profileName: result.profileName,
      profile: result.profile,
      pages: result.pages,
      docxPath: result.docxPath,
      pdfPath: result.pdfPath,
    };
  }

  if (bestResult) {
    console.warn(
      `[runOrderGeneration] ${label} fallback to best_effort profile=${bestResult.profileName}`,
    );
    return bestResult;
  }

  throw new Error(`No valid ${label} profile could be generated`);
};

const runOrderGeneration = async (report, job) => {
  const documentConfig = documents.order;

  if (!documentConfig) {
    throw new Error("Document config not found for type: order");
  }

  const payload = buildPayload(report);
  const { orderProfiles = [], approvalProfiles = [] } =
    documentConfig.profiles || {};

  const finalDocxPath = buildFinalDocxPath(job);
  const pdfDir = buildPdfDir();
  const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

  const tempArtifacts = [
    buildDocxPath(job, "order"),
    buildDocxPath(job, "approval"),
    buildPdfPath(buildDocxPath(job, "order"), pdfDir),
    buildPdfPath(buildDocxPath(job, "approval"), pdfDir),
  ];

  const orderResult = await runSingleSelection({
    payload,
    job,
    profiles: orderProfiles,
    label: "order",
    generateDocument: order.generateOrderOnlyDocument,
  });

  const approvalResult = await runSingleSelection({
    payload,
    job,
    profiles: approvalProfiles,
    label: "approval",
    generateDocument: order.generateApprovalOnlyDocument,
  });

  const finalProfile = {
    orderProfile: orderResult.profile,
    approvalProfile: approvalResult.profile,
  };

  await ensureParentDir(finalDocxPath);

  await order.generateOrderDocument({
    payload,
    outputPath: finalDocxPath,
    profile: finalProfile,
    orderSource: {
      docxPath: orderResult.docxPath,
      pdfPath: orderResult.pdfPath,
    },
    approvalSource: {
      docxPath: approvalResult.docxPath,
      pdfPath: approvalResult.pdfPath,
    },
  });

  const finalDocxBuffer = await fs.readFile(finalDocxPath);
  const fixedFinalDocxBuffer = applyDocumentPaginationFixes(finalDocxBuffer, {
    documentType: "order",
  });
  await fs.writeFile(finalDocxPath, fixedFinalDocxBuffer);

  await cleanupFileIfExists(finalPdfPath);
  await convertToPdf(finalDocxPath, pdfDir);

  await cleanupArtifacts(tempArtifacts);

  return {
    status: "passed",
    profile: {
      orderProfile: orderResult.profileName,
      approvalProfile: approvalResult.profileName,
    },
    layoutCheck: {
      order: {
        status: orderResult.status,
        profile: orderResult.profileName,
        pages: orderResult.pages,
      },
      approval: {
        status: approvalResult.status,
        profile: approvalResult.profileName,
        pages: approvalResult.pages,
      },
    },
    resolvedProfile: finalProfile,
    outputPath: finalPdfPath,
    pdfPath: finalPdfPath,
    docxPath: finalDocxPath,
    generationResult: {
      docxPath: finalDocxPath,
      pdfPath: finalPdfPath,
    },
  };
};

module.exports = runOrderGeneration;
// const fs = require("fs/promises");
// const path = require("path");
// const { convertToPdf } = require("../pdf");
// const { applyDocumentPaginationFixes } = require("../word");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");
// const order = require("../documents/order");

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job, suffix) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const buildFinalDocxPath = (job, suffix = "nakaz") =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (error) {
//     if (error.code !== "ENOENT") {
//       console.warn(`[runOrderGeneration] cleanup failed: ${filePath}`);
//       console.warn(error.message);
//     }
//   }
// };

// const cleanupArtifacts = async (paths) => {
//   for (const filePath of paths) {
//     await cleanupFileIfExists(filePath);
//   }
// };

// const buildValidationContext = (payload, label) => {
//   if (label === "order") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "order",
//       markers: {
//         nakazuiu: "НАКАЗУЮ:",
//         signerPosition: signer.position,
//         signerRank: signer.rank,
//         signerFirstName: signer.firstName,
//         signerLastName: signer.lastName,
//       },
//     };
//   }

//   if (label === "approval") {
//     return {
//       documentType: "approval",
//       markers: {},
//     };
//   }

//   return {
//     documentType: label,
//     markers: {},
//   };
// };

// const normalizeLayoutResult = (layoutResult) => {
//   const pages = Array.isArray(layoutResult)
//     ? layoutResult
//     : Array.isArray(layoutResult?.pages)
//       ? layoutResult.pages
//       : [];

//   const hardViolations = Array.isArray(layoutResult?.hardViolations)
//     ? layoutResult.hardViolations
//     : [];

//   const hasBelowMinPage = pages.some((page) => page.status === "below_min");
//   const hasLayoutError = hasBelowMinPage || hardViolations.length > 0;

//   return {
//     pages,
//     hardViolations,
//     hasLayoutError,
//   };
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
//   generateDocument,
//   label,
// }) => {
//   try {
//     await ensureParentDir(docxPath);
//     await generateDocument(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload, label);
//     const layoutResult = await validateLayout(pdfPath, validationContext);
//     const { pages, hardViolations, hasLayoutError } =
//       normalizeLayoutResult(layoutResult);

//     return {
//       ok: true,
//       label,
//       profileName,
//       profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(
//       `[runOrderGeneration] ${label} candidate failed: ${profileName}`,
//     );
//     console.error(error.message);

//     return {
//       ok: false,
//       label,
//       profileName,
//       profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runSingleSelection = async ({
//   payload,
//   job,
//   profiles,
//   label,
//   generateDocument,
// }) => {
//   if (!profiles.length) {
//     throw new Error(`No ${label} profiles configured`);
//   }

//   const docxPath = buildDocxPath(job, label);
//   const pdfDir = buildPdfDir();

//   let bestResult = null;

//   for (const profile of profiles) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile,
//       profileName: profile.name,
//       generateDocument,
//       label,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runOrderGeneration] ${label} passed with profile=${result.profileName}`,
//       );

//       return {
//         status: "passed",
//         profileName: result.profileName,
//         profile: result.profile,
//         pages: result.pages,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     bestResult = {
//       status: "best_effort",
//       profileName: result.profileName,
//       profile: result.profile,
//       pages: result.pages,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     };
//   }

//   if (bestResult) {
//     console.warn(
//       `[runOrderGeneration] ${label} fallback to best_effort profile=${bestResult.profileName}`,
//     );
//     return bestResult;
//   }

//   throw new Error(`No valid ${label} profile could be generated`);
// };

// const collectOrderCandidates = async ({ payload, job, profiles }) => {
//   if (!profiles.length) {
//     throw new Error("No order profiles configured");
//   }

//   const pdfDir = buildPdfDir();
//   const results = [];

//   for (let index = 0; index < profiles.length; index++) {
//     const profile = profiles[index];
//     const docxPath = buildDocxPath(job, `order_candidate_${index + 1}`);

//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile,
//       profileName: profile.name,
//       generateDocument: order.generateOrderOnlyDocument,
//       label: "order",
//     });

//     if (!result.ok) {
//       continue;
//     }

//     results.push({
//       status: result.hasLayoutError ? "best_effort" : "passed",
//       profileName: result.profileName,
//       profile: result.profile,
//       pages: result.pages,
//       hardViolations: result.hardViolations,
//       hasLayoutError: result.hasLayoutError,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     });
//   }

//   if (!results.length) {
//     throw new Error("No valid order profile could be generated");
//   }

//   const passed = results.filter((item) => !item.hasLayoutError);
//   const bestEffort = results.filter((item) => item.hasLayoutError);

//   return [...passed, ...bestEffort];
// };

// const evaluateFinalOrderCandidate = async ({
//   payload,
//   job,
//   orderCandidate,
//   approvalResult,
// }) => {
//   const finalSuffix = `nakaz_${orderCandidate.profileName}`;
//   const finalDocxPath = buildFinalDocxPath(job, finalSuffix);
//   const pdfDir = buildPdfDir();
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   const finalProfile = {
//     orderProfile: orderCandidate.profile,
//     approvalProfile: approvalResult.profile,
//   };

//   try {
//     await ensureParentDir(finalDocxPath);

//     await cleanupFileIfExists(finalDocxPath);
//     await cleanupFileIfExists(finalPdfPath);

//     await order.generateOrderDocument({
//       payload,
//       outputPath: finalDocxPath,
//       profile: finalProfile,
//       orderSource: {
//         docxPath: orderCandidate.docxPath,
//         pdfPath: orderCandidate.pdfPath,
//       },
//       approvalSource: {
//         docxPath: approvalResult.docxPath,
//         pdfPath: approvalResult.pdfPath,
//       },
//     });

//     const finalDocxBuffer = await fs.readFile(finalDocxPath);
//     const fixedFinalDocxBuffer = applyDocumentPaginationFixes(finalDocxBuffer, {
//       documentType: "order",
//     });
//     await fs.writeFile(finalDocxPath, fixedFinalDocxBuffer);

//     await convertToPdf(finalDocxPath, pdfDir);

//     const validationContext = buildValidationContext(payload, "order");
//     const finalLayoutResult = await validateLayout(
//       finalPdfPath,
//       validationContext,
//     );
//     const { pages, hardViolations, hasLayoutError } =
//       normalizeLayoutResult(finalLayoutResult);

//     return {
//       ok: true,
//       status: hasLayoutError ? "best_effort" : "passed",
//       profileName: orderCandidate.profileName,
//       profile: orderCandidate.profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       docxPath: finalDocxPath,
//       pdfPath: finalPdfPath,
//       resolvedProfile: finalProfile,
//       sourceOrderCandidate: orderCandidate,
//     };
//   } catch (error) {
//     console.error(
//       `[runOrderGeneration] final order candidate failed: ${orderCandidate.profileName}`,
//     );
//     console.error(error.message);

//     return {
//       ok: false,
//       status: "failed",
//       profileName: orderCandidate.profileName,
//       profile: orderCandidate.profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath: finalDocxPath,
//       pdfPath: finalPdfPath,
//       resolvedProfile: finalProfile,
//       sourceOrderCandidate: orderCandidate,
//     };
//   }
// };

// const runOrderGeneration = async (report, job) => {
//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};

//   const pdfDir = buildPdfDir();

//   const approvalResult = await runSingleSelection({
//     payload,
//     job,
//     profiles: approvalProfiles,
//     label: "approval",
//     generateDocument: order.generateApprovalOnlyDocument,
//   });

//   const orderCandidates = await collectOrderCandidates({
//     payload,
//     job,
//     profiles: orderProfiles,
//   });

//   let finalBestResult = null;

//   for (const orderCandidate of orderCandidates) {
//     const finalResult = await evaluateFinalOrderCandidate({
//       payload,
//       job,
//       orderCandidate,
//       approvalResult,
//     });

//     if (!finalResult.ok) {
//       continue;
//     }

//     if (!finalResult.hasLayoutError) {
//       console.log(
//         `[runOrderGeneration] final order passed with orderProfile=${finalResult.profileName} approvalProfile=${approvalResult.profileName}`,
//       );

//       finalBestResult = finalResult;
//       break;
//     }

//     if (!finalBestResult) {
//       finalBestResult = finalResult;
//     }
//   }

//   if (!finalBestResult) {
//     throw new Error("No valid final order document could be generated");
//   }

//   const finalDocxPath = buildFinalDocxPath(job);
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   await ensureParentDir(finalDocxPath);
//   await cleanupFileIfExists(finalDocxPath);
//   await cleanupFileIfExists(finalPdfPath);

//   await fs.copyFile(finalBestResult.docxPath, finalDocxPath);
//   await fs.copyFile(finalBestResult.pdfPath, finalPdfPath);

//   const tempArtifacts = [
//     buildDocxPath(job, "approval"),
//     buildPdfPath(buildDocxPath(job, "approval"), pdfDir),
//     ...orderCandidates.flatMap((candidate, index) => [
//       buildDocxPath(job, `order_candidate_${index + 1}`),
//       buildPdfPath(buildDocxPath(job, `order_candidate_${index + 1}`), pdfDir),
//     ]),
//     ...orderCandidates.flatMap((candidate) => {
//       const candidateDocxPath = buildFinalDocxPath(
//         job,
//         `nakaz_${candidate.profileName}`,
//       );
//       return [candidateDocxPath, buildPdfPath(candidateDocxPath, pdfDir)];
//     }),
//   ];

//   await cleanupArtifacts(tempArtifacts);

//   return {
//     status: finalBestResult.status,
//     profile: {
//       orderProfile: finalBestResult.profileName,
//       approvalProfile: approvalResult.profileName,
//     },
//     layoutCheck: {
//       order: {
//         status: finalBestResult.sourceOrderCandidate.status,
//         profile: finalBestResult.profileName,
//         pages: finalBestResult.sourceOrderCandidate.pages,
//       },
//       approval: {
//         status: approvalResult.status,
//         profile: approvalResult.profileName,
//         pages: approvalResult.pages,
//       },
//       finalOrder: {
//         status: finalBestResult.status,
//         profile: finalBestResult.profileName,
//         pages: finalBestResult.pages,
//         hardViolations: finalBestResult.hardViolations,
//       },
//     },
//     resolvedProfile: finalBestResult.resolvedProfile,
//     outputPath: finalPdfPath,
//     pdfPath: finalPdfPath,
//     docxPath: finalDocxPath,
//     generationResult: {
//       docxPath: finalDocxPath,
//       pdfPath: finalPdfPath,
//     },
//   };
// };

// module.exports = runOrderGeneration;
