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
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

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

//   await order.generateOrderDocument({
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

//   const finalDocxBuffer = await fs.readFile(finalDocxPath);
//   const fixedFinalDocxBuffer = applyDocumentPaginationFixes(finalDocxBuffer, {
//     documentType: "order",
//   });
//   await fs.writeFile(finalDocxPath, fixedFinalDocxBuffer);

//   await cleanupFileIfExists(finalPdfPath);
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

// const fs = require("fs/promises");
// const path = require("path");
// const { convertToPdf } = require("../pdf");
// const { applyDocumentPaginationFixes } = require("../word");
// const validateLayout = require("./validateLayout");
// const evaluateOrderSignaturePlacement = require("./evaluateOrderSignaturePlacement");
// const detectDetachedSignature = require("../generation/detectDetachedSignature");
// const documents = require("../documents");
// const order = require("../documents/order");

// const LOG_PREFIX = "[runOrderGeneration]";
// const DEBUG_KEEP_ARTIFACTS = false;

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// const buildFinalCandidateDocxPath = (job, suffix) =>
//   path.join(
//     process.cwd(),
//     "storage",
//     "docx",
//     `${job._id}_nakaz_${suffix}.docx`,
//   );

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath, options = {}) => {
//   const retries = Number.isInteger(options.retries) ? options.retries : 6;
//   const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 500;

//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       await fs.unlink(filePath);
//       console.log(`${LOG_PREFIX} cleaned file=${filePath}`);
//       return true;
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return true;
//       }

//       const isLastAttempt = attempt === retries;
//       const isRetryable =
//         error.code === "EBUSY" ||
//         error.code === "EPERM" ||
//         error.code === "EACCES";

//       if (!isRetryable || isLastAttempt) {
//         console.warn(
//           `${LOG_PREFIX} cleanup failed file=${filePath} code=${error.code}`,
//         );
//         console.warn(error.message);
//         return false;
//       }

//       console.warn(
//         `${LOG_PREFIX} cleanup retry file=${filePath} code=${error.code} attempt=${attempt + 1}/${retries + 1}`,
//       );

//       await sleep(delayMs);
//     }
//   }

//   return false;
// };

// const cleanupArtifacts = async (paths) => {
//   const uniquePaths = [...new Set(paths.filter(Boolean))];

//   console.log(
//     `${LOG_PREFIX} cleanupArtifacts start count=${uniquePaths.length}`,
//   );

//   for (const filePath of uniquePaths) {
//     await cleanupFileIfExists(filePath);
//   }

//   console.log(`${LOG_PREFIX} cleanupArtifacts end`);
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

// const evaluateOrderCandidate = async ({
//   payload,
//   job,
//   profile,
//   profileIndex,
//   signaturePlacementOptions,
// }) => {
//   const pdfDir = buildPdfDir();
//   const docxPath = buildDocxPath(job, `order_candidate_${profileIndex + 1}`);
//   const pdfPath = buildPdfPath(docxPath, pdfDir);

//   try {
//     console.log(
//       `${LOG_PREFIX} evaluateOrderCandidate start profile=${profile.name} index=${profileIndex}`,
//     );
//     console.log(`${LOG_PREFIX} candidate docxPath=${docxPath}`);
//     console.log(`${LOG_PREFIX} candidate pdfPath=${pdfPath}`);

//     await ensureParentDir(docxPath);
//     await cleanupFileIfExists(docxPath);
//     await cleanupFileIfExists(pdfPath);

//     console.log(
//       `${LOG_PREFIX} generateOrderOnlyDocument start profile=${profile.name}`,
//     );
//     await order.generateOrderOnlyDocument(payload, docxPath, profile);
//     console.log(
//       `${LOG_PREFIX} generateOrderOnlyDocument done profile=${profile.name}`,
//     );

//     console.log(`${LOG_PREFIX} convertToPdf start profile=${profile.name}`);
//     await convertToPdf(docxPath, pdfDir);
//     console.log(`${LOG_PREFIX} convertToPdf done profile=${profile.name}`);

//     console.log(`${LOG_PREFIX} validateLayout start profile=${profile.name}`);
//     const layoutResult = await validateLayout(
//       pdfPath,
//       buildValidationContext(payload, "order"),
//     );
//     console.log(`${LOG_PREFIX} validateLayout done profile=${profile.name}`);

//     const { pages, hardViolations, hasLayoutError } =
//       normalizeLayoutResult(layoutResult);

//     console.log(
//       `${LOG_PREFIX} evaluateOrderSignaturePlacement start profile=${profile.name}`,
//     );
//     const signaturePlacement = await evaluateOrderSignaturePlacement(
//       pdfPath,
//       payload,
//       signaturePlacementOptions,
//     );
//     console.log(
//       `${LOG_PREFIX} evaluateOrderSignaturePlacement done profile=${profile.name} ok=${signaturePlacement?.ok} reason=${signaturePlacement?.reason}`,
//     );

//     const hasSignaturePlacementError = !signaturePlacement.ok;
//     const isGood = !hasSignaturePlacementError;

//     console.log(
//       `${LOG_PREFIX} evaluated order profile=${profile.name} index=${profileIndex} layoutError=${hasLayoutError} signaturePlacementError=${hasSignaturePlacementError} isGood=${isGood}`,
//     );

//     if (hasLayoutError) {
//       console.warn(
//         `${LOG_PREFIX} order layout warning profile=${profile.name}`,
//       );

//       if (Array.isArray(hardViolations) && hardViolations.length) {
//         console.warn(hardViolations);
//       }

//       if (Array.isArray(pages) && pages.length) {
//         console.warn(
//           pages.map((page) => ({
//             pageNumber: page.pageNumber,
//             status: page.status,
//             fillRatio: page.fillRatio,
//           })),
//         );
//       }
//     }

//     if (hasSignaturePlacementError) {
//       console.warn(
//         `${LOG_PREFIX} order signature placement rejected profile=${profile.name} reason=${signaturePlacement.reason}`,
//       );
//       console.warn(signaturePlacement.debug);
//     }

//     return {
//       ok: true,
//       isGood,
//       profileIndex,
//       profileName: profile.name,
//       profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       signaturePlacement,
//       hasSignaturePlacementError,
//       docxPath,
//       pdfPath,
//       artifacts: [docxPath, pdfPath],
//     };
//   } catch (error) {
//     console.error(
//       `${LOG_PREFIX} order candidate failed profile=${profile.name} index=${profileIndex}`,
//     );
//     console.error(error);

//     return {
//       ok: false,
//       isGood: false,
//       profileIndex,
//       profileName: profile.name,
//       profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       signaturePlacement: null,
//       hasSignaturePlacementError: true,
//       docxPath,
//       pdfPath,
//       artifacts: [docxPath, pdfPath],
//       error: error.message,
//     };
//   }
// };

// const findNextGoodOrderCandidate = async ({
//   payload,
//   job,
//   orderProfiles,
//   signaturePlacementOptions,
//   startIndex = 0,
// }) => {
//   console.log(
//     `${LOG_PREFIX} findNextGoodOrderCandidate start startIndex=${startIndex} totalProfiles=${orderProfiles.length}`,
//   );

//   const artifacts = [];

//   for (let index = startIndex; index < orderProfiles.length; index++) {
//     const profile = orderProfiles[index];

//     console.log(
//       `${LOG_PREFIX} trying order profile index=${index} profile=${profile.name}`,
//     );

//     const result = await evaluateOrderCandidate({
//       payload,
//       job,
//       profile,
//       profileIndex: index,
//       signaturePlacementOptions,
//     });

//     artifacts.push(...(result.artifacts || []));

//     if (!result.ok) {
//       console.warn(
//         `${LOG_PREFIX} order candidate execution failed profile=${profile.name}`,
//       );
//       continue;
//     }

//     if (result.isGood) {
//       console.log(
//         `${LOG_PREFIX} order passed with profile=${result.profileName}; stopping at index=${index}`,
//       );
//       return {
//         selected: result,
//         artifacts,
//       };
//     }

//     console.warn(
//       `${LOG_PREFIX} order rejected profile=${result.profileName} layoutError=${result.hasLayoutError} signaturePlacementError=${result.hasSignaturePlacementError}`,
//     );
//   }

//   console.warn(
//     `${LOG_PREFIX} no good order profile found starting from index=${startIndex}`,
//   );

//   return {
//     selected: null,
//     artifacts,
//   };
// };

// const runApprovalSelection = async ({ payload, job, profiles }) => {
//   if (!profiles.length) {
//     throw new Error("No approval profiles configured");
//   }

//   const docxPath = buildDocxPath(job, "approval");
//   const pdfDir = buildPdfDir();

//   let bestResult = null;

//   console.log(
//     `${LOG_PREFIX} runApprovalSelection start totalProfiles=${profiles.length}`,
//   );

//   for (const profile of profiles) {
//     try {
//       console.log(
//         `${LOG_PREFIX} approval evaluate start profile=${profile.name}`,
//       );

//       await ensureParentDir(docxPath);
//       await cleanupFileIfExists(docxPath);
//       await cleanupFileIfExists(buildPdfPath(docxPath, pdfDir));

//       console.log(
//         `${LOG_PREFIX} generateApprovalOnlyDocument start profile=${profile.name}`,
//       );
//       await order.generateApprovalOnlyDocument(payload, docxPath, profile);
//       console.log(
//         `${LOG_PREFIX} generateApprovalOnlyDocument done profile=${profile.name}`,
//       );

//       console.log(
//         `${LOG_PREFIX} approval convertToPdf start profile=${profile.name}`,
//       );
//       await convertToPdf(docxPath, pdfDir);
//       console.log(
//         `${LOG_PREFIX} approval convertToPdf done profile=${profile.name}`,
//       );

//       const pdfPath = buildPdfPath(docxPath, pdfDir);

//       console.log(
//         `${LOG_PREFIX} approval validateLayout start profile=${profile.name}`,
//       );
//       const layoutResult = await validateLayout(
//         pdfPath,
//         buildValidationContext(payload, "approval"),
//       );
//       console.log(
//         `${LOG_PREFIX} approval validateLayout done profile=${profile.name}`,
//       );

//       const { pages, hasLayoutError } = normalizeLayoutResult(layoutResult);

//       const result = {
//         status: hasLayoutError ? "best_effort" : "passed",
//         profileName: profile.name,
//         profile,
//         pages,
//         docxPath,
//         pdfPath,
//         artifacts: [docxPath, pdfPath],
//       };

//       console.log(
//         `${LOG_PREFIX} approval evaluated profile=${profile.name} hasLayoutError=${hasLayoutError}`,
//       );

//       if (!hasLayoutError) {
//         console.log(
//           `${LOG_PREFIX} approval passed with profile=${result.profileName}`,
//         );
//         return result;
//       }

//       if (!bestResult) {
//         bestResult = result;
//       }
//     } catch (error) {
//       console.error(
//         `${LOG_PREFIX} approval candidate failed profile=${profile.name}`,
//       );
//       console.error(error);
//     }
//   }

//   if (bestResult) {
//     console.warn(
//       `${LOG_PREFIX} approval fallback to best_effort profile=${bestResult.profileName}`,
//     );
//     return bestResult;
//   }

//   throw new Error("No valid approval profile could be generated");
// };

// const generateFinalOrderArtifact = async ({
//   payload,
//   outputPath,
//   finalProfile,
//   orderSource,
//   approvalSource,
// }) => {
//   console.log(
//     `${LOG_PREFIX} generate final DOCX start outputPath=${outputPath}`,
//   );

//   await ensureParentDir(outputPath);

//   await order.generateOrderDocument({
//     payload,
//     outputPath,
//     profile: finalProfile,
//     orderSource,
//     approvalSource,
//   });

//   console.log(
//     `${LOG_PREFIX} generate final DOCX done outputPath=${outputPath}`,
//   );

//   const finalDocxBuffer = await fs.readFile(outputPath);
//   const fixedFinalDocxBuffer = applyDocumentPaginationFixes(finalDocxBuffer, {
//     documentType: "order",
//   });

//   await fs.writeFile(outputPath, fixedFinalDocxBuffer);

//   console.log(
//     `${LOG_PREFIX} pagination fixes applied outputPath=${outputPath}`,
//   );
// };

// const evaluateFinalDocument = async ({ pdfPath, payload }) => {
//   console.log(`${LOG_PREFIX} evaluateFinalDocument start pdfPath=${pdfPath}`);

//   const layoutResult = await validateLayout(
//     pdfPath,
//     buildValidationContext(payload, "order"),
//   );

//   const { pages, hardViolations, hasLayoutError } =
//     normalizeLayoutResult(layoutResult);

//   let signatureCheck = {
//     detached: false,
//     reason: "final_signature_check_skipped",
//     debug: {},
//   };

//   try {
//     if (typeof detectDetachedSignature === "function") {
//       console.log(`${LOG_PREFIX} detectDetachedSignature start`);
//       signatureCheck = await detectDetachedSignature(pdfPath, payload);
//       console.log(
//         `${LOG_PREFIX} detectDetachedSignature done detached=${signatureCheck?.detached} reason=${signatureCheck?.reason}`,
//       );
//     } else {
//       console.warn(
//         `${LOG_PREFIX} detectDetachedSignature is not a function; skipping final safeguard`,
//       );
//     }
//   } catch (error) {
//     console.warn(`${LOG_PREFIX} detectDetachedSignature failed`);
//     console.warn(error);
//   }

//   console.log(
//     `${LOG_PREFIX} evaluateFinalDocument done hasLayoutError=${hasLayoutError} hasDetachedSignature=${Boolean(signatureCheck?.detached)}`,
//   );

//   return {
//     pages,
//     hardViolations,
//     hasLayoutError,
//     signatureCheck,
//     hasDetachedSignature: Boolean(signatureCheck?.detached),
//   };
// };

// const buildFinalResult = ({
//   finalDocxPath,
//   finalPdfPath,
//   orderResult,
//   approvalResult,
//   finalProfile,
//   finalEvaluation,
//   fallbackUsed,
// }) => ({
//   status:
//     !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//       ? "passed"
//       : "best_effort",
//   profile: {
//     orderProfile: orderResult.profileName,
//     approvalProfile: approvalResult.profileName,
//   },
//   layoutCheck: {
//     order: {
//       status: orderResult.status || "passed",
//       profile: orderResult.profileName,
//       pages: orderResult.pages,
//       signaturePlacement: orderResult.signaturePlacement || null,
//     },
//     approval: {
//       status: approvalResult.status,
//       profile: approvalResult.profileName,
//       pages: approvalResult.pages,
//     },
//     finalOrder: {
//       status:
//         !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//           ? "passed"
//           : "best_effort",
//       profile: orderResult.profileName,
//       pages: finalEvaluation.pages,
//       hardViolations: finalEvaluation.hardViolations,
//       detachedSignature: finalEvaluation.hasDetachedSignature,
//       detachedSignatureReason: finalEvaluation.signatureCheck?.reason || null,
//       detachedSignatureDebug: finalEvaluation.signatureCheck?.debug || {},
//     },
//   },
//   resolvedProfile: finalProfile,
//   outputPath: finalPdfPath,
//   pdfPath: finalPdfPath,
//   docxPath: finalDocxPath,
//   generationResult: {
//     docxPath: finalDocxPath,
//     pdfPath: finalPdfPath,
//   },
//   fallbackUsed,
// });

// const runOrderGeneration = async (report, job) => {
//   console.log(`${LOG_PREFIX} entered job=${job._id}`);

//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};
//   const generationPolicy = documentConfig.generationPolicy || {};

//   const signaturePlacementOptions = {
//     markerText:
//       typeof generationPolicy.signaturePlacementMarkerText === "string"
//         ? generationPolicy.signaturePlacementMarkerText
//         : "__SIGNATURE_START__",
//     minTextBeforeMarkerLength: Number.isInteger(
//       generationPolicy.minTextBeforeMarkerLength,
//     )
//       ? generationPolicy.minTextBeforeMarkerLength
//       : 120,
//     minBodySignalScore: Number.isInteger(generationPolicy.minBodySignalScore)
//       ? generationPolicy.minBodySignalScore
//       : 1,
//   };

//   const maxFinalFallbackAttempts = Number.isInteger(
//     generationPolicy.maxFinalFallbackAttempts,
//   )
//     ? generationPolicy.maxFinalFallbackAttempts
//     : 1;

//   const finalDocxPath = buildFinalDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   const tempArtifacts = [];
//   const fallbackArtifacts = [];

//   console.log(
//     `${LOG_PREFIX} config loaded job=${job._id} orderProfiles=${orderProfiles.length} approvalProfiles=${approvalProfiles.length}`,
//   );
//   console.log(`${LOG_PREFIX} finalDocxPath=${finalDocxPath}`);
//   console.log(`${LOG_PREFIX} finalPdfPath=${finalPdfPath}`);
//   console.log(
//     `${LOG_PREFIX} signaturePlacementOptions=${JSON.stringify(signaturePlacementOptions)}`,
//   );
//   console.log(
//     `${LOG_PREFIX} maxFinalFallbackAttempts=${maxFinalFallbackAttempts}`,
//   );

//   try {
//     console.log(
//       `${LOG_PREFIX} starting order candidate selection job=${job._id}`,
//     );

//     const orderSelection = await findNextGoodOrderCandidate({
//       payload,
//       job,
//       orderProfiles,
//       signaturePlacementOptions,
//       startIndex: 0,
//     });

//     tempArtifacts.push(...(orderSelection.artifacts || []));

//     const selectedOrder = orderSelection.selected;

//     if (!selectedOrder) {
//       throw new Error("No good order profile found");
//     }

//     console.log(
//       `${LOG_PREFIX} selected order profile=${selectedOrder.profileName} index=${selectedOrder.profileIndex}`,
//     );

//     console.log(`${LOG_PREFIX} starting approval selection job=${job._id}`);

//     const approvalResult = await runApprovalSelection({
//       payload,
//       job,
//       profiles: approvalProfiles,
//     });

//     tempArtifacts.push(...(approvalResult.artifacts || []));

//     console.log(
//       `${LOG_PREFIX} selected approval profile=${approvalResult.profileName}`,
//     );

//     let activeOrderResult = {
//       status: "passed",
//       profileName: selectedOrder.profileName,
//       profile: selectedOrder.profile,
//       pages: selectedOrder.pages,
//       signaturePlacement: selectedOrder.signaturePlacement,
//       docxPath: selectedOrder.docxPath,
//       pdfPath: selectedOrder.pdfPath,
//       profileIndex: selectedOrder.profileIndex,
//     };

//     let finalProfile = {
//       orderProfile: activeOrderResult.profile,
//       approvalProfile: approvalResult.profile,
//     };

//     await cleanupFileIfExists(finalDocxPath);
//     await cleanupFileIfExists(finalPdfPath);

//     await generateFinalOrderArtifact({
//       payload,
//       outputPath: finalDocxPath,
//       finalProfile,
//       orderSource: {
//         docxPath: activeOrderResult.docxPath,
//         pdfPath: activeOrderResult.pdfPath,
//       },
//       approvalSource: {
//         docxPath: approvalResult.docxPath,
//         pdfPath: approvalResult.pdfPath,
//       },
//     });

//     console.log(`${LOG_PREFIX} final convertToPdf start`);
//     await convertToPdf(finalDocxPath, pdfDir);
//     console.log(`${LOG_PREFIX} final convertToPdf done`);

//     let finalEvaluation = await evaluateFinalDocument({
//       pdfPath: finalPdfPath,
//       payload,
//     });

//     let fallbackUsed = false;
//     let nextSearchIndex = activeOrderResult.profileIndex + 1;
//     let attempts = 0;

//     while (
//       finalEvaluation.hasDetachedSignature &&
//       attempts < maxFinalFallbackAttempts
//     ) {
//       attempts += 1;

//       console.warn(
//         `${LOG_PREFIX} final detached signature detected for profile=${activeOrderResult.profileName}; fallback attempt=${attempts}`,
//       );

//       const nextOrderSelection = await findNextGoodOrderCandidate({
//         payload,
//         job,
//         orderProfiles,
//         signaturePlacementOptions,
//         startIndex: nextSearchIndex,
//       });

//       tempArtifacts.push(...(nextOrderSelection.artifacts || []));

//       const nextOrder = nextOrderSelection.selected;

//       if (!nextOrder) {
//         console.warn(
//           `${LOG_PREFIX} no additional good order profile found for final fallback`,
//         );
//         break;
//       }

//       nextSearchIndex = nextOrder.profileIndex + 1;

//       activeOrderResult = {
//         status: "passed",
//         profileName: nextOrder.profileName,
//         profile: nextOrder.profile,
//         pages: nextOrder.pages,
//         signaturePlacement: nextOrder.signaturePlacement,
//         docxPath: nextOrder.docxPath,
//         pdfPath: nextOrder.pdfPath,
//         profileIndex: nextOrder.profileIndex,
//       };

//       finalProfile = {
//         orderProfile: activeOrderResult.profile,
//         approvalProfile: approvalResult.profile,
//       };

//       const fallbackFinalDocxPath = buildFinalCandidateDocxPath(
//         job,
//         `fallback_${attempts}`,
//       );
//       const fallbackFinalPdfPath = buildPdfPath(fallbackFinalDocxPath, pdfDir);

//       fallbackArtifacts.push(fallbackFinalDocxPath, fallbackFinalPdfPath);

//       await cleanupFileIfExists(fallbackFinalDocxPath);
//       await cleanupFileIfExists(fallbackFinalPdfPath);

//       await generateFinalOrderArtifact({
//         payload,
//         outputPath: fallbackFinalDocxPath,
//         finalProfile,
//         orderSource: {
//           docxPath: activeOrderResult.docxPath,
//           pdfPath: activeOrderResult.pdfPath,
//         },
//         approvalSource: {
//           docxPath: approvalResult.docxPath,
//           pdfPath: approvalResult.pdfPath,
//         },
//       });

//       console.log(`${LOG_PREFIX} fallback final convertToPdf start`);
//       await convertToPdf(fallbackFinalDocxPath, pdfDir);
//       console.log(`${LOG_PREFIX} fallback final convertToPdf done`);

//       const fallbackEvaluation = await evaluateFinalDocument({
//         pdfPath: fallbackFinalPdfPath,
//         payload,
//       });

//       if (!fallbackEvaluation.hasDetachedSignature) {
//         await cleanupFileIfExists(finalDocxPath);
//         await cleanupFileIfExists(finalPdfPath);
//         await fs.copyFile(fallbackFinalDocxPath, finalDocxPath);
//         await fs.copyFile(fallbackFinalPdfPath, finalPdfPath);

//         finalEvaluation = fallbackEvaluation;
//         fallbackUsed = true;
//         break;
//       }
//     }

//     console.log(`${LOG_PREFIX} completed job=${job._id}`);

//     return buildFinalResult({
//       finalDocxPath,
//       finalPdfPath,
//       orderResult: activeOrderResult,
//       approvalResult,
//       finalProfile,
//       finalEvaluation,
//       fallbackUsed,
//     });
//   } catch (error) {
//     console.error(`${LOG_PREFIX} failed job=${job._id}`);
//     console.error(error);
//     throw error;
//   } finally {
//     console.log(`${LOG_PREFIX} finally start job=${job._id}`);

//     if (DEBUG_KEEP_ARTIFACTS) {
//       console.log(
//         `${LOG_PREFIX} cleanup skipped because DEBUG_KEEP_ARTIFACTS=true`,
//       );
//     } else {
//       await sleep(1000);
//       await cleanupArtifacts([...tempArtifacts, ...fallbackArtifacts]);
//       console.log(`${LOG_PREFIX} cleanup completed job=${job._id}`);
//     }

//     console.log(`${LOG_PREFIX} finally end job=${job._id}`);
//   }
// };

// module.exports = runOrderGeneration;
// const fs = require("fs/promises");
// const path = require("path");
// const { convertToPdf } = require("../pdf");
// const { applyDocumentPaginationFixes } = require("../word");
// const validateLayout = require("./validateLayout");
// const evaluateOrderSignaturePlacement = require("./evaluateOrderSignaturePlacement");
// const detectDetachedSignature = require("../generation/detectDetachedSignature");
// const documents = require("../documents");
// const order = require("../documents/order");

// const LOG_PREFIX = "[runOrderGeneration]";
// const DEBUG_KEEP_ARTIFACTS = false;

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// const buildFinalCandidateDocxPath = (job, suffix) =>
//   path.join(
//     process.cwd(),
//     "storage",
//     "docx",
//     `${job._id}_nakaz_${suffix}.docx`,
//   );

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath, options = {}) => {
//   const retries = Number.isInteger(options.retries) ? options.retries : 6;
//   const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 500;

//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       await fs.unlink(filePath);
//       console.log(`${LOG_PREFIX} cleaned file=${filePath}`);
//       return true;
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return true;
//       }

//       const isLastAttempt = attempt === retries;
//       const isRetryable =
//         error.code === "EBUSY" ||
//         error.code === "EPERM" ||
//         error.code === "EACCES";

//       if (!isRetryable || isLastAttempt) {
//         console.warn(
//           `${LOG_PREFIX} cleanup failed file=${filePath} code=${error.code}`,
//         );
//         console.warn(error.message);
//         return false;
//       }

//       console.warn(
//         `${LOG_PREFIX} cleanup retry file=${filePath} code=${error.code} attempt=${attempt + 1}/${retries + 1}`,
//       );

//       await sleep(delayMs);
//     }
//   }

//   return false;
// };

// const cleanupArtifacts = async (paths) => {
//   const uniquePaths = [...new Set(paths.filter(Boolean))];

//   console.log(
//     `${LOG_PREFIX} cleanupArtifacts start count=${uniquePaths.length}`,
//   );

//   for (const filePath of uniquePaths) {
//     await cleanupFileIfExists(filePath);
//   }

//   console.log(`${LOG_PREFIX} cleanupArtifacts end`);
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

// const evaluateOrderCandidate = async ({
//   payload,
//   job,
//   profile,
//   profileIndex,
//   signaturePlacementOptions,
// }) => {
//   const pdfDir = buildPdfDir();
//   const docxPath = buildDocxPath(job, `order_candidate_${profileIndex + 1}`);
//   const pdfPath = buildPdfPath(docxPath, pdfDir);

//   try {
//     console.log(
//       `${LOG_PREFIX} evaluateOrderCandidate start profile=${profile.name} index=${profileIndex}`,
//     );
//     console.log(`${LOG_PREFIX} candidate docxPath=${docxPath}`);
//     console.log(`${LOG_PREFIX} candidate pdfPath=${pdfPath}`);

//     await ensureParentDir(docxPath);
//     await cleanupFileIfExists(docxPath);
//     await cleanupFileIfExists(pdfPath);

//     console.log(
//       `${LOG_PREFIX} generateOrderOnlyDocument start profile=${profile.name}`,
//     );
//     await order.generateOrderOnlyDocument(payload, docxPath, profile);
//     console.log(
//       `${LOG_PREFIX} generateOrderOnlyDocument done profile=${profile.name}`,
//     );

//     console.log(`${LOG_PREFIX} convertToPdf start profile=${profile.name}`);
//     await convertToPdf(docxPath, pdfDir);
//     console.log(`${LOG_PREFIX} convertToPdf done profile=${profile.name}`);

//     console.log(`${LOG_PREFIX} validateLayout start profile=${profile.name}`);
//     const layoutResult = await validateLayout(
//       pdfPath,
//       buildValidationContext(payload, "order"),
//     );
//     console.log(`${LOG_PREFIX} validateLayout done profile=${profile.name}`);

//     const { pages, hardViolations, hasLayoutError } =
//       normalizeLayoutResult(layoutResult);

//     console.log(
//       `${LOG_PREFIX} evaluateOrderSignaturePlacement start profile=${profile.name}`,
//     );
//     const signaturePlacement = await evaluateOrderSignaturePlacement(
//       pdfPath,
//       payload,
//       signaturePlacementOptions,
//     );
//     console.log(
//       `${LOG_PREFIX} evaluateOrderSignaturePlacement done profile=${profile.name} ok=${signaturePlacement?.ok} reason=${signaturePlacement?.reason}`,
//     );

//     const hasSignaturePlacementError = !signaturePlacement.ok;
//     const isGood = !hasSignaturePlacementError;

//     console.log(
//       `${LOG_PREFIX} evaluated order profile=${profile.name} index=${profileIndex} layoutError=${hasLayoutError} signaturePlacementError=${hasSignaturePlacementError} isGood=${isGood}`,
//     );

//     if (hasLayoutError) {
//       console.warn(
//         `${LOG_PREFIX} order layout warning profile=${profile.name}`,
//       );

//       if (Array.isArray(hardViolations) && hardViolations.length) {
//         console.warn(hardViolations);
//       }

//       if (Array.isArray(pages) && pages.length) {
//         console.warn(
//           pages.map((page) => ({
//             pageNumber: page.pageNumber,
//             status: page.status,
//             fillRatio: page.fillRatio,
//           })),
//         );
//       }
//     }

//     if (hasSignaturePlacementError) {
//       console.warn(
//         `${LOG_PREFIX} order signature placement rejected profile=${profile.name} reason=${signaturePlacement.reason}`,
//       );
//       console.warn(signaturePlacement.debug);
//     }

//     return {
//       ok: true,
//       isGood,
//       profileIndex,
//       profileName: profile.name,
//       profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       signaturePlacement,
//       hasSignaturePlacementError,
//       docxPath,
//       pdfPath,
//       artifacts: [docxPath, pdfPath],
//     };
//   } catch (error) {
//     console.error(
//       `${LOG_PREFIX} order candidate failed profile=${profile.name} index=${profileIndex}`,
//     );
//     console.error(error);

//     return {
//       ok: false,
//       isGood: false,
//       profileIndex,
//       profileName: profile.name,
//       profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       signaturePlacement: null,
//       hasSignaturePlacementError: true,
//       docxPath,
//       pdfPath,
//       artifacts: [docxPath, pdfPath],
//       error: error.message,
//     };
//   }
// };

// const findNextGoodOrderCandidate = async ({
//   payload,
//   job,
//   orderProfiles,
//   signaturePlacementOptions,
//   startIndex = 0,
// }) => {
//   console.log(
//     `${LOG_PREFIX} findNextGoodOrderCandidate start startIndex=${startIndex} totalProfiles=${orderProfiles.length}`,
//   );

//   const artifacts = [];

//   for (let index = startIndex; index < orderProfiles.length; index++) {
//     const profile = orderProfiles[index];

//     console.log(
//       `${LOG_PREFIX} trying order profile index=${index} profile=${profile.name}`,
//     );

//     const result = await evaluateOrderCandidate({
//       payload,
//       job,
//       profile,
//       profileIndex: index,
//       signaturePlacementOptions,
//     });

//     artifacts.push(...(result.artifacts || []));

//     if (!result.ok) {
//       console.warn(
//         `${LOG_PREFIX} order candidate execution failed profile=${profile.name}`,
//       );
//       continue;
//     }

//     if (result.isGood) {
//       console.log(
//         `${LOG_PREFIX} order passed with profile=${result.profileName}; stopping at index=${index}`,
//       );
//       return {
//         selected: result,
//         artifacts,
//       };
//     }

//     console.warn(
//       `${LOG_PREFIX} order rejected profile=${result.profileName} layoutError=${result.hasLayoutError} signaturePlacementError=${result.hasSignaturePlacementError}`,
//     );
//   }

//   console.warn(
//     `${LOG_PREFIX} no good order profile found starting from index=${startIndex}`,
//   );

//   return {
//     selected: null,
//     artifacts,
//   };
// };

// const runApprovalSelection = async ({ payload, job, profiles }) => {
//   if (!profiles.length) {
//     throw new Error("No approval profiles configured");
//   }

//   const docxPath = buildDocxPath(job, "approval");
//   const pdfDir = buildPdfDir();

//   let bestResult = null;

//   console.log(
//     `${LOG_PREFIX} runApprovalSelection start totalProfiles=${profiles.length}`,
//   );

//   for (const profile of profiles) {
//     try {
//       console.log(
//         `${LOG_PREFIX} approval evaluate start profile=${profile.name}`,
//       );

//       await ensureParentDir(docxPath);
//       await cleanupFileIfExists(docxPath);
//       await cleanupFileIfExists(buildPdfPath(docxPath, pdfDir));

//       console.log(
//         `${LOG_PREFIX} generateApprovalOnlyDocument start profile=${profile.name}`,
//       );
//       await order.generateApprovalOnlyDocument(payload, docxPath, profile);
//       console.log(
//         `${LOG_PREFIX} generateApprovalOnlyDocument done profile=${profile.name}`,
//       );

//       console.log(
//         `${LOG_PREFIX} approval convertToPdf start profile=${profile.name}`,
//       );
//       await convertToPdf(docxPath, pdfDir);
//       console.log(
//         `${LOG_PREFIX} approval convertToPdf done profile=${profile.name}`,
//       );

//       const pdfPath = buildPdfPath(docxPath, pdfDir);

//       console.log(
//         `${LOG_PREFIX} approval validateLayout start profile=${profile.name}`,
//       );
//       const layoutResult = await validateLayout(
//         pdfPath,
//         buildValidationContext(payload, "approval"),
//       );
//       console.log(
//         `${LOG_PREFIX} approval validateLayout done profile=${profile.name}`,
//       );

//       const { pages, hasLayoutError } = normalizeLayoutResult(layoutResult);

//       const result = {
//         status: hasLayoutError ? "best_effort" : "passed",
//         profileName: profile.name,
//         profile,
//         pages,
//         docxPath,
//         pdfPath,
//         artifacts: [docxPath, pdfPath],
//       };

//       console.log(
//         `${LOG_PREFIX} approval evaluated profile=${profile.name} hasLayoutError=${hasLayoutError} pages=${pages.length}`,
//       );

//       if (pages.length !== 1) {
//         console.warn(
//           `${LOG_PREFIX} approval rejected because pageCount=${pages.length}, expected=1 profile=${profile.name}`,
//         );
//         if (!bestResult || bestResult.pages.length !== 1) {
//           bestResult = result;
//         }
//         continue;
//       }

//       if (!hasLayoutError) {
//         console.log(
//           `${LOG_PREFIX} approval passed with profile=${result.profileName}`,
//         );
//         return result;
//       }

//       if (!bestResult) {
//         bestResult = result;
//       }
//     } catch (error) {
//       console.error(
//         `${LOG_PREFIX} approval candidate failed profile=${profile.name}`,
//       );
//       console.error(error);
//     }
//   }

//   if (bestResult && bestResult.pages.length === 1) {
//     console.warn(
//       `${LOG_PREFIX} approval fallback to best_effort profile=${bestResult.profileName}`,
//     );
//     return bestResult;
//   }

//   throw new Error("No valid approval profile could be generated");
// };

// const generateFinalOrderArtifact = async ({
//   payload,
//   outputPath,
//   finalProfile,
//   orderSource,
//   approvalSource,
// }) => {
//   console.log(
//     `${LOG_PREFIX} generate final DOCX/PDF start outputPath=${outputPath}`,
//   );

//   await ensureParentDir(outputPath);

//   const result = await order.generateOrderDocument({
//     payload,
//     outputPath,
//     profile: finalProfile,
//     orderSource,
//     approvalSource,
//   });

//   console.log(
//     `${LOG_PREFIX} generate final DOCX/PDF done outputPath=${outputPath}`,
//   );
//   console.log(
//     `${LOG_PREFIX} final artifact paths docx=${result?.docxPath} pdf=${result?.pdfPath}`,
//   );

//   const finalDocxBuffer = await fs.readFile(outputPath);
//   const fixedFinalDocxBuffer = applyDocumentPaginationFixes(finalDocxBuffer, {
//     documentType: "order",
//   });

//   await fs.writeFile(outputPath, fixedFinalDocxBuffer);

//   console.log(
//     `${LOG_PREFIX} pagination fixes applied outputPath=${outputPath}`,
//   );

//   return result;
// };

// const evaluateFinalDocument = async ({ pdfPath, payload }) => {
//   console.log(`${LOG_PREFIX} evaluateFinalDocument start pdfPath=${pdfPath}`);

//   const layoutResult = await validateLayout(pdfPath, {
//     documentType: "order_print_pdf",
//     markers: {},
//   });

//   const pages = Array.isArray(layoutResult?.pages) ? layoutResult.pages : [];
//   const hardViolations = Array.isArray(layoutResult?.hardViolations)
//     ? layoutResult.hardViolations
//     : [];

//   const hasLayoutError = hardViolations.length > 0;

//   let signatureCheck = {
//     detached: false,
//     reason: "final_signature_check_skipped_for_print_pdf",
//     debug: {},
//   };

//   try {
//     if (typeof detectDetachedSignature === "function") {
//       console.log(`${LOG_PREFIX} detectDetachedSignature start`);
//       signatureCheck = await detectDetachedSignature(pdfPath, payload);
//       console.log(
//         `${LOG_PREFIX} detectDetachedSignature done detached=${signatureCheck?.detached} reason=${signatureCheck?.reason}`,
//       );
//     } else {
//       console.warn(
//         `${LOG_PREFIX} detectDetachedSignature is not a function; skipping final safeguard`,
//       );
//     }
//   } catch (error) {
//     console.warn(`${LOG_PREFIX} detectDetachedSignature failed`);
//     console.warn(error);
//   }

//   console.log(
//     `${LOG_PREFIX} evaluateFinalDocument done hasLayoutError=${hasLayoutError} hasDetachedSignature=${Boolean(signatureCheck?.detached)} totalPages=${pages.length}`,
//   );

//   return {
//     pages,
//     hardViolations,
//     hasLayoutError,
//     signatureCheck,
//     hasDetachedSignature: Boolean(signatureCheck?.detached),
//   };
// };

// const buildFinalResult = ({
//   finalDocxPath,
//   finalPdfPath,
//   orderResult,
//   approvalResult,
//   finalProfile,
//   finalEvaluation,
//   fallbackUsed,
//   generationArtifact,
// }) => ({
//   status:
//     !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//       ? "passed"
//       : "best_effort",
//   profile: {
//     orderProfile: orderResult.profileName,
//     approvalProfile: approvalResult.profileName,
//   },
//   layoutCheck: {
//     order: {
//       status: orderResult.status || "passed",
//       profile: orderResult.profileName,
//       pages: orderResult.pages,
//       signaturePlacement: orderResult.signaturePlacement || null,
//     },
//     approval: {
//       status: approvalResult.status,
//       profile: approvalResult.profileName,
//       pages: approvalResult.pages,
//     },
//     finalOrder: {
//       status:
//         !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//           ? "passed"
//           : "best_effort",
//       profile: orderResult.profileName,
//       pages: finalEvaluation.pages,
//       hardViolations: finalEvaluation.hardViolations,
//       detachedSignature: finalEvaluation.hasDetachedSignature,
//       detachedSignatureReason: finalEvaluation.signatureCheck?.reason || null,
//       detachedSignatureDebug: finalEvaluation.signatureCheck?.debug || {},
//     },
//   },
//   resolvedProfile: finalProfile,
//   outputPath: finalPdfPath,
//   pdfPath: finalPdfPath,
//   docxPath: finalDocxPath,
//   generationResult: {
//     docxPath: finalDocxPath,
//     pdfPath: finalPdfPath,
//     preparedPrintSettings: generationArtifact?.preparedPrintSettings || null,
//     assemblerPrintSettings: generationArtifact?.assemblerPrintSettings || null,
//     pdfMeta: generationArtifact?.pdfMeta || null,
//     pdfValidation: generationArtifact?.pdfValidation || null,
//     mergedDocxValidation: generationArtifact?.mergedDocxValidation || null,
//   },
//   fallbackUsed,
// });

// const runOrderGeneration = async (report, job) => {
//   console.log(`${LOG_PREFIX} entered job=${job._id}`);

//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};
//   const generationPolicy = documentConfig.generationPolicy || {};

//   const signaturePlacementOptions = {
//     markerText:
//       typeof generationPolicy.signaturePlacementMarkerText === "string"
//         ? generationPolicy.signaturePlacementMarkerText
//         : "__SIGNATURE_START__",
//     minTextBeforeMarkerLength: Number.isInteger(
//       generationPolicy.minTextBeforeMarkerLength,
//     )
//       ? generationPolicy.minTextBeforeMarkerLength
//       : 120,
//     minBodySignalScore: Number.isInteger(generationPolicy.minBodySignalScore)
//       ? generationPolicy.minBodySignalScore
//       : 1,
//   };

//   const maxFinalFallbackAttempts = Number.isInteger(
//     generationPolicy.maxFinalFallbackAttempts,
//   )
//     ? generationPolicy.maxFinalFallbackAttempts
//     : 1;

//   const finalDocxPath = buildFinalDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   const tempArtifacts = [];
//   const fallbackArtifacts = [];

//   console.log(
//     `${LOG_PREFIX} config loaded job=${job._id} orderProfiles=${orderProfiles.length} approvalProfiles=${approvalProfiles.length}`,
//   );
//   console.log(`${LOG_PREFIX} finalDocxPath=${finalDocxPath}`);
//   console.log(`${LOG_PREFIX} finalPdfPath=${finalPdfPath}`);
//   console.log(
//     `${LOG_PREFIX} signaturePlacementOptions=${JSON.stringify(signaturePlacementOptions)}`,
//   );
//   console.log(
//     `${LOG_PREFIX} maxFinalFallbackAttempts=${maxFinalFallbackAttempts}`,
//   );
//   console.log(
//     `${LOG_PREFIX} requested printSettings=${JSON.stringify(payload?.printSettings || null)}`,
//   );

//   try {
//     console.log(
//       `${LOG_PREFIX} starting order candidate selection job=${job._id}`,
//     );

//     const orderSelection = await findNextGoodOrderCandidate({
//       payload,
//       job,
//       orderProfiles,
//       signaturePlacementOptions,
//       startIndex: 0,
//     });

//     tempArtifacts.push(...(orderSelection.artifacts || []));

//     const selectedOrder = orderSelection.selected;

//     if (!selectedOrder) {
//       throw new Error("No good order profile found");
//     }

//     console.log(
//       `${LOG_PREFIX} selected order profile=${selectedOrder.profileName} index=${selectedOrder.profileIndex}`,
//     );

//     console.log(`${LOG_PREFIX} starting approval selection job=${job._id}`);

//     const approvalResult = await runApprovalSelection({
//       payload,
//       job,
//       profiles: approvalProfiles,
//     });

//     tempArtifacts.push(...(approvalResult.artifacts || []));

//     console.log(
//       `${LOG_PREFIX} selected approval profile=${approvalResult.profileName}`,
//     );

//     let activeOrderResult = {
//       status: "passed",
//       profileName: selectedOrder.profileName,
//       profile: selectedOrder.profile,
//       pages: selectedOrder.pages,
//       signaturePlacement: selectedOrder.signaturePlacement,
//       docxPath: selectedOrder.docxPath,
//       pdfPath: selectedOrder.pdfPath,
//       profileIndex: selectedOrder.profileIndex,
//     };

//     let finalProfile = {
//       orderProfile: activeOrderResult.profile,
//       approvalProfile: approvalResult.profile,
//     };

//     await cleanupFileIfExists(finalDocxPath);
//     await cleanupFileIfExists(finalPdfPath);

//     let generationArtifact = await generateFinalOrderArtifact({
//       payload,
//       outputPath: finalDocxPath,
//       finalProfile,
//       orderSource: {
//         docxPath: activeOrderResult.docxPath,
//         pdfPath: activeOrderResult.pdfPath,
//       },
//       approvalSource: {
//         docxPath: approvalResult.docxPath,
//         pdfPath: approvalResult.pdfPath,
//       },
//     });

//     console.log(
//       `${LOG_PREFIX} generated final artifact meta=${JSON.stringify({
//         pdfMeta: generationArtifact?.pdfMeta || null,
//         preparedPrintSettings:
//           generationArtifact?.preparedPrintSettings || null,
//         assemblerPrintSettings:
//           generationArtifact?.assemblerPrintSettings || null,
//       })}`,
//     );

//     let finalEvaluation = await evaluateFinalDocument({
//       pdfPath: finalPdfPath,
//       payload,
//     });

//     let fallbackUsed = false;
//     let nextSearchIndex = activeOrderResult.profileIndex + 1;
//     let attempts = 0;

//     while (
//       finalEvaluation.hasDetachedSignature &&
//       attempts < maxFinalFallbackAttempts
//     ) {
//       attempts += 1;

//       console.warn(
//         `${LOG_PREFIX} final detached signature detected for profile=${activeOrderResult.profileName}; fallback attempt=${attempts}`,
//       );

//       const nextOrderSelection = await findNextGoodOrderCandidate({
//         payload,
//         job,
//         orderProfiles,
//         signaturePlacementOptions,
//         startIndex: nextSearchIndex,
//       });

//       tempArtifacts.push(...(nextOrderSelection.artifacts || []));

//       const nextOrder = nextOrderSelection.selected;

//       if (!nextOrder) {
//         console.warn(
//           `${LOG_PREFIX} no additional good order profile found for final fallback`,
//         );
//         break;
//       }

//       nextSearchIndex = nextOrder.profileIndex + 1;

//       activeOrderResult = {
//         status: "passed",
//         profileName: nextOrder.profileName,
//         profile: nextOrder.profile,
//         pages: nextOrder.pages,
//         signaturePlacement: nextOrder.signaturePlacement,
//         docxPath: nextOrder.docxPath,
//         pdfPath: nextOrder.pdfPath,
//         profileIndex: nextOrder.profileIndex,
//       };

//       finalProfile = {
//         orderProfile: activeOrderResult.profile,
//         approvalProfile: approvalResult.profile,
//       };

//       const fallbackFinalDocxPath = buildFinalCandidateDocxPath(
//         job,
//         `fallback_${attempts}`,
//       );
//       const fallbackFinalPdfPath = buildPdfPath(fallbackFinalDocxPath, pdfDir);

//       fallbackArtifacts.push(fallbackFinalDocxPath, fallbackFinalPdfPath);

//       await cleanupFileIfExists(fallbackFinalDocxPath);
//       await cleanupFileIfExists(fallbackFinalPdfPath);

//       const fallbackArtifact = await generateFinalOrderArtifact({
//         payload,
//         outputPath: fallbackFinalDocxPath,
//         finalProfile,
//         orderSource: {
//           docxPath: activeOrderResult.docxPath,
//           pdfPath: activeOrderResult.pdfPath,
//         },
//         approvalSource: {
//           docxPath: approvalResult.docxPath,
//           pdfPath: approvalResult.pdfPath,
//         },
//       });

//       const fallbackPdfPath = fallbackArtifact?.pdfPath || fallbackFinalPdfPath;

//       const fallbackEvaluation = await evaluateFinalDocument({
//         pdfPath: fallbackPdfPath,
//         payload,
//       });

//       if (!fallbackEvaluation.hasDetachedSignature) {
//         await cleanupFileIfExists(finalDocxPath);
//         await cleanupFileIfExists(finalPdfPath);
//         await fs.copyFile(fallbackFinalDocxPath, finalDocxPath);
//         await fs.copyFile(fallbackPdfPath, finalPdfPath);

//         finalEvaluation = fallbackEvaluation;
//         generationArtifact = {
//           ...fallbackArtifact,
//           docxPath: finalDocxPath,
//           pdfPath: finalPdfPath,
//           pdfMeta: fallbackArtifact?.pdfMeta
//             ? {
//                 ...fallbackArtifact.pdfMeta,
//                 outputPdfPath: finalPdfPath,
//               }
//             : null,
//           pdfValidation: fallbackArtifact?.pdfValidation
//             ? {
//                 ...fallbackArtifact.pdfValidation,
//                 pdfPath: finalPdfPath,
//               }
//             : null,
//         };
//         fallbackUsed = true;
//         break;
//       }
//     }

//     console.log(`${LOG_PREFIX} completed job=${job._id}`);
//     console.log(
//       `${LOG_PREFIX} final output docx=${finalDocxPath} pdf=${finalPdfPath}`,
//     );

//     return buildFinalResult({
//       finalDocxPath,
//       finalPdfPath,
//       orderResult: activeOrderResult,
//       approvalResult,
//       finalProfile,
//       finalEvaluation,
//       fallbackUsed,
//       generationArtifact,
//     });
//   } catch (error) {
//     console.error(`${LOG_PREFIX} failed job=${job._id}`);
//     console.error(error);
//     throw error;
//   } finally {
//     console.log(`${LOG_PREFIX} finally start job=${job._id}`);

//     if (DEBUG_KEEP_ARTIFACTS) {
//       console.log(
//         `${LOG_PREFIX} cleanup skipped because DEBUG_KEEP_ARTIFACTS=true`,
//       );
//     } else {
//       await sleep(1000);
//       await cleanupArtifacts([...tempArtifacts, ...fallbackArtifacts]);
//       console.log(`${LOG_PREFIX} cleanup completed job=${job._id}`);
//     }

//     console.log(`${LOG_PREFIX} finally end job=${job._id}`);
//   }
// };

// module.exports = runOrderGeneration;
// const fs = require("fs/promises");
// const path = require("path");
// const { convertToPdf } = require("../pdf");
// const { applyDocumentPaginationFixes } = require("../word");
// const validateLayout = require("./validateLayout");
// const evaluateOrderSignaturePlacement = require("./evaluateOrderSignaturePlacement");
// const detectDetachedSignature = require("../generation/detectDetachedSignature");
// const documents = require("../documents");
// const order = require("../documents/order");

// const LOG_PREFIX = "[runOrderGeneration]";
// const DEBUG_KEEP_ARTIFACTS = false;

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// const buildFinalCandidateDocxPath = (job, suffix) =>
//   path.join(
//     process.cwd(),
//     "storage",
//     "docx",
//     `${job._id}_nakaz_${suffix}.docx`,
//   );

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath, options = {}) => {
//   const retries = Number.isInteger(options.retries) ? options.retries : 6;
//   const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 500;

//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       await fs.unlink(filePath);
//       console.log(`${LOG_PREFIX} cleaned file=${filePath}`);
//       return true;
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return true;
//       }

//       const isLastAttempt = attempt === retries;
//       const isRetryable =
//         error.code === "EBUSY" ||
//         error.code === "EPERM" ||
//         error.code === "EACCES";

//       if (!isRetryable || isLastAttempt) {
//         console.warn(
//           `${LOG_PREFIX} cleanup failed file=${filePath} code=${error.code}`,
//         );
//         console.warn(error.message);
//         return false;
//       }

//       console.warn(
//         `${LOG_PREFIX} cleanup retry file=${filePath} code=${error.code} attempt=${attempt + 1}/${retries + 1}`,
//       );

//       await sleep(delayMs);
//     }
//   }

//   return false;
// };

// const cleanupArtifacts = async (paths) => {
//   const uniquePaths = [...new Set(paths.filter(Boolean))];

//   console.log(
//     `${LOG_PREFIX} cleanupArtifacts start count=${uniquePaths.length}`,
//   );

//   for (const filePath of uniquePaths) {
//     await cleanupFileIfExists(filePath);
//   }

//   console.log(`${LOG_PREFIX} cleanupArtifacts end`);
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

// const prepareCleanFinalOrderSource = async ({
//   job,
//   sourceDocxPath,
//   artifacts,
//   suffix = "order_final_source",
// }) => {
//   const pdfDir = buildPdfDir();
//   const cleanDocxPath = buildDocxPath(job, suffix);
//   const cleanPdfPath = buildPdfPath(cleanDocxPath, pdfDir);

//   console.log(
//     `${LOG_PREFIX} prepareCleanFinalOrderSource start sourceDocxPath=${sourceDocxPath} suffix=${suffix}`,
//   );
//   console.log(`${LOG_PREFIX} clean order source docxPath=${cleanDocxPath}`);
//   console.log(`${LOG_PREFIX} clean order source pdfPath=${cleanPdfPath}`);

//   await cleanupFileIfExists(cleanDocxPath);
//   await cleanupFileIfExists(cleanPdfPath);

//   const sourceBuffer = await fs.readFile(sourceDocxPath);
//   const cleanedBuffer = applyDocumentPaginationFixes(sourceBuffer, {
//     documentType: "order",
//   });

//   await ensureParentDir(cleanDocxPath);
//   await fs.writeFile(cleanDocxPath, cleanedBuffer);

//   console.log(`${LOG_PREFIX} clean order source DOCX written`);

//   await convertToPdf(cleanDocxPath, pdfDir);

//   console.log(`${LOG_PREFIX} clean order source PDF generated`);

//   if (Array.isArray(artifacts)) {
//     artifacts.push(cleanDocxPath, cleanPdfPath);
//   }

//   return {
//     docxPath: cleanDocxPath,
//     pdfPath: cleanPdfPath,
//   };
// };

// const evaluateOrderCandidate = async ({
//   payload,
//   job,
//   profile,
//   profileIndex,
//   signaturePlacementOptions,
// }) => {
//   const pdfDir = buildPdfDir();
//   const docxPath = buildDocxPath(job, `order_candidate_${profileIndex + 1}`);
//   const pdfPath = buildPdfPath(docxPath, pdfDir);

//   try {
//     console.log(
//       `${LOG_PREFIX} evaluateOrderCandidate start profile=${profile.name} index=${profileIndex}`,
//     );
//     console.log(`${LOG_PREFIX} candidate docxPath=${docxPath}`);
//     console.log(`${LOG_PREFIX} candidate pdfPath=${pdfPath}`);

//     await ensureParentDir(docxPath);
//     await cleanupFileIfExists(docxPath);
//     await cleanupFileIfExists(pdfPath);

//     console.log(
//       `${LOG_PREFIX} generateOrderOnlyDocument start profile=${profile.name}`,
//     );
//     await order.generateOrderOnlyDocument(payload, docxPath, profile);
//     console.log(
//       `${LOG_PREFIX} generateOrderOnlyDocument done profile=${profile.name}`,
//     );

//     console.log(`${LOG_PREFIX} convertToPdf start profile=${profile.name}`);
//     await convertToPdf(docxPath, pdfDir);
//     console.log(`${LOG_PREFIX} convertToPdf done profile=${profile.name}`);

//     console.log(`${LOG_PREFIX} validateLayout start profile=${profile.name}`);
//     const layoutResult = await validateLayout(
//       pdfPath,
//       buildValidationContext(payload, "order"),
//     );
//     console.log(`${LOG_PREFIX} validateLayout done profile=${profile.name}`);

//     const { pages, hardViolations, hasLayoutError } =
//       normalizeLayoutResult(layoutResult);

//     console.log(
//       `${LOG_PREFIX} evaluateOrderSignaturePlacement start profile=${profile.name}`,
//     );
//     const signaturePlacement = await evaluateOrderSignaturePlacement(
//       pdfPath,
//       payload,
//       signaturePlacementOptions,
//     );
//     console.log(
//       `${LOG_PREFIX} evaluateOrderSignaturePlacement done profile=${profile.name} ok=${signaturePlacement?.ok} reason=${signaturePlacement?.reason}`,
//     );

//     const hasSignaturePlacementError = !signaturePlacement.ok;
//     const isGood = !hasSignaturePlacementError;

//     console.log(
//       `${LOG_PREFIX} evaluated order profile=${profile.name} index=${profileIndex} layoutError=${hasLayoutError} signaturePlacementError=${hasSignaturePlacementError} isGood=${isGood}`,
//     );

//     if (hasLayoutError) {
//       console.warn(
//         `${LOG_PREFIX} order layout warning profile=${profile.name}`,
//       );

//       if (Array.isArray(hardViolations) && hardViolations.length) {
//         console.warn(hardViolations);
//       }

//       if (Array.isArray(pages) && pages.length) {
//         console.warn(
//           pages.map((page) => ({
//             pageNumber: page.pageNumber,
//             status: page.status,
//             fillRatio: page.fillRatio,
//           })),
//         );
//       }
//     }

//     if (hasSignaturePlacementError) {
//       console.warn(
//         `${LOG_PREFIX} order signature placement rejected profile=${profile.name} reason=${signaturePlacement.reason}`,
//       );
//       console.warn(signaturePlacement.debug);
//     }

//     return {
//       ok: true,
//       isGood,
//       profileIndex,
//       profileName: profile.name,
//       profile,
//       pages,
//       hardViolations,
//       hasLayoutError,
//       signaturePlacement,
//       hasSignaturePlacementError,
//       docxPath,
//       pdfPath,
//       artifacts: [docxPath, pdfPath],
//     };
//   } catch (error) {
//     console.error(
//       `${LOG_PREFIX} order candidate failed profile=${profile.name} index=${profileIndex}`,
//     );
//     console.error(error);

//     return {
//       ok: false,
//       isGood: false,
//       profileIndex,
//       profileName: profile.name,
//       profile,
//       pages: [],
//       hardViolations: [],
//       hasLayoutError: true,
//       signaturePlacement: null,
//       hasSignaturePlacementError: true,
//       docxPath,
//       pdfPath,
//       artifacts: [docxPath, pdfPath],
//       error: error.message,
//     };
//   }
// };

// const findNextGoodOrderCandidate = async ({
//   payload,
//   job,
//   orderProfiles,
//   signaturePlacementOptions,
//   startIndex = 0,
// }) => {
//   console.log(
//     `${LOG_PREFIX} findNextGoodOrderCandidate start startIndex=${startIndex} totalProfiles=${orderProfiles.length}`,
//   );

//   const artifacts = [];

//   for (let index = startIndex; index < orderProfiles.length; index++) {
//     const profile = orderProfiles[index];

//     console.log(
//       `${LOG_PREFIX} trying order profile index=${index} profile=${profile.name}`,
//     );

//     const result = await evaluateOrderCandidate({
//       payload,
//       job,
//       profile,
//       profileIndex: index,
//       signaturePlacementOptions,
//     });

//     artifacts.push(...(result.artifacts || []));

//     if (!result.ok) {
//       console.warn(
//         `${LOG_PREFIX} order candidate execution failed profile=${profile.name}`,
//       );
//       continue;
//     }

//     if (result.isGood) {
//       console.log(
//         `${LOG_PREFIX} order passed with profile=${result.profileName}; stopping at index=${index}`,
//       );
//       return {
//         selected: result,
//         artifacts,
//       };
//     }

//     console.warn(
//       `${LOG_PREFIX} order rejected profile=${result.profileName} layoutError=${result.hasLayoutError} signaturePlacementError=${result.hasSignaturePlacementError}`,
//     );
//   }

//   console.warn(
//     `${LOG_PREFIX} no good order profile found starting from index=${startIndex}`,
//   );

//   return {
//     selected: null,
//     artifacts,
//   };
// };

// const runApprovalSelection = async ({ payload, job, profiles }) => {
//   if (!profiles.length) {
//     throw new Error("No approval profiles configured");
//   }

//   const docxPath = buildDocxPath(job, "approval");
//   const pdfDir = buildPdfDir();

//   let bestResult = null;

//   console.log(
//     `${LOG_PREFIX} runApprovalSelection start totalProfiles=${profiles.length}`,
//   );

//   for (const profile of profiles) {
//     try {
//       console.log(
//         `${LOG_PREFIX} approval evaluate start profile=${profile.name}`,
//       );

//       await ensureParentDir(docxPath);
//       await cleanupFileIfExists(docxPath);
//       await cleanupFileIfExists(buildPdfPath(docxPath, pdfDir));

//       console.log(
//         `${LOG_PREFIX} generateApprovalOnlyDocument start profile=${profile.name}`,
//       );
//       await order.generateApprovalOnlyDocument(payload, docxPath, profile);
//       console.log(
//         `${LOG_PREFIX} generateApprovalOnlyDocument done profile=${profile.name}`,
//       );

//       console.log(
//         `${LOG_PREFIX} approval convertToPdf start profile=${profile.name}`,
//       );
//       await convertToPdf(docxPath, pdfDir);
//       console.log(
//         `${LOG_PREFIX} approval convertToPdf done profile=${profile.name}`,
//       );

//       const pdfPath = buildPdfPath(docxPath, pdfDir);

//       console.log(
//         `${LOG_PREFIX} approval validateLayout start profile=${profile.name}`,
//       );
//       const layoutResult = await validateLayout(
//         pdfPath,
//         buildValidationContext(payload, "approval"),
//       );
//       console.log(
//         `${LOG_PREFIX} approval validateLayout done profile=${profile.name}`,
//       );

//       const { pages, hasLayoutError } = normalizeLayoutResult(layoutResult);

//       const result = {
//         status: hasLayoutError ? "best_effort" : "passed",
//         profileName: profile.name,
//         profile,
//         pages,
//         docxPath,
//         pdfPath,
//         artifacts: [docxPath, pdfPath],
//       };

//       console.log(
//         `${LOG_PREFIX} approval evaluated profile=${profile.name} hasLayoutError=${hasLayoutError} pages=${pages.length}`,
//       );

//       if (pages.length !== 1) {
//         console.warn(
//           `${LOG_PREFIX} approval rejected because pageCount=${pages.length}, expected=1 profile=${profile.name}`,
//         );
//         if (!bestResult || bestResult.pages.length !== 1) {
//           bestResult = result;
//         }
//         continue;
//       }

//       if (!hasLayoutError) {
//         console.log(
//           `${LOG_PREFIX} approval passed with profile=${result.profileName}`,
//         );
//         return result;
//       }

//       if (!bestResult) {
//         bestResult = result;
//       }
//     } catch (error) {
//       console.error(
//         `${LOG_PREFIX} approval candidate failed profile=${profile.name}`,
//       );
//       console.error(error);
//     }
//   }

//   if (bestResult && bestResult.pages.length === 1) {
//     console.warn(
//       `${LOG_PREFIX} approval fallback to best_effort profile=${bestResult.profileName}`,
//     );
//     return bestResult;
//   }

//   throw new Error("No valid approval profile could be generated");
// };

// const generateFinalOrderArtifact = async ({
//   payload,
//   outputPath,
//   finalProfile,
//   orderSource,
//   approvalSource,
// }) => {
//   console.log(
//     `${LOG_PREFIX} generate final DOCX/PDF start outputPath=${outputPath}`,
//   );

//   await ensureParentDir(outputPath);

//   const result = await order.generateOrderDocument({
//     payload,
//     outputPath,
//     profile: finalProfile,
//     orderSource,
//     approvalSource,
//   });

//   console.log(
//     `${LOG_PREFIX} generate final DOCX/PDF done outputPath=${outputPath}`,
//   );
//   console.log(
//     `${LOG_PREFIX} final artifact paths docx=${result?.docxPath} pdf=${result?.pdfPath}`,
//   );
//   console.log(
//     `${LOG_PREFIX} final merged DOCX written by generateOrderDocument outputPath=${outputPath}`,
//   );

//   return result;
// };

// const evaluateFinalDocument = async ({ pdfPath, payload }) => {
//   console.log(`${LOG_PREFIX} evaluateFinalDocument start pdfPath=${pdfPath}`);

//   const layoutResult = await validateLayout(pdfPath, {
//     documentType: "order_print_pdf",
//     markers: {},
//   });

//   const pages = Array.isArray(layoutResult?.pages) ? layoutResult.pages : [];
//   const hardViolations = Array.isArray(layoutResult?.hardViolations)
//     ? layoutResult.hardViolations
//     : [];

//   const hasLayoutError = hardViolations.length > 0;

//   let signatureCheck = {
//     detached: false,
//     reason: "final_signature_check_skipped_for_print_pdf",
//     debug: {},
//   };

//   try {
//     if (typeof detectDetachedSignature === "function") {
//       console.log(`${LOG_PREFIX} detectDetachedSignature start`);
//       signatureCheck = await detectDetachedSignature(pdfPath, payload);
//       console.log(
//         `${LOG_PREFIX} detectDetachedSignature done detached=${signatureCheck?.detached} reason=${signatureCheck?.reason}`,
//       );
//     } else {
//       console.warn(
//         `${LOG_PREFIX} detectDetachedSignature is not a function; skipping final safeguard`,
//       );
//     }
//   } catch (error) {
//     console.warn(`${LOG_PREFIX} detectDetachedSignature failed`);
//     console.warn(error);
//   }

//   console.log(
//     `${LOG_PREFIX} evaluateFinalDocument done hasLayoutError=${hasLayoutError} hasDetachedSignature=${Boolean(signatureCheck?.detached)} totalPages=${pages.length}`,
//   );

//   return {
//     pages,
//     hardViolations,
//     hasLayoutError,
//     signatureCheck,
//     hasDetachedSignature: Boolean(signatureCheck?.detached),
//   };
// };

// const buildFinalResult = ({
//   finalDocxPath,
//   finalPdfPath,
//   orderResult,
//   approvalResult,
//   finalProfile,
//   finalEvaluation,
//   fallbackUsed,
//   generationArtifact,
// }) => ({
//   status:
//     !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//       ? "passed"
//       : "best_effort",
//   profile: {
//     orderProfile: orderResult.profileName,
//     approvalProfile: approvalResult.profileName,
//   },
//   layoutCheck: {
//     order: {
//       status: orderResult.status || "passed",
//       profile: orderResult.profileName,
//       pages: orderResult.pages,
//       signaturePlacement: orderResult.signaturePlacement || null,
//     },
//     approval: {
//       status: approvalResult.status,
//       profile: approvalResult.profileName,
//       pages: approvalResult.pages,
//     },
//     finalOrder: {
//       status:
//         !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//           ? "passed"
//           : "best_effort",
//       profile: orderResult.profileName,
//       pages: finalEvaluation.pages,
//       hardViolations: finalEvaluation.hardViolations,
//       detachedSignature: finalEvaluation.hasDetachedSignature,
//       detachedSignatureReason: finalEvaluation.signatureCheck?.reason || null,
//       detachedSignatureDebug: finalEvaluation.signatureCheck?.debug || {},
//     },
//   },
//   resolvedProfile: finalProfile,
//   outputPath: finalPdfPath,
//   pdfPath: finalPdfPath,
//   docxPath: finalDocxPath,
//   generationResult: {
//     docxPath: finalDocxPath,
//     pdfPath: finalPdfPath,
//     preparedPrintSettings: generationArtifact?.preparedPrintSettings || null,
//     assemblerPrintSettings: generationArtifact?.assemblerPrintSettings || null,
//     pdfMeta: generationArtifact?.pdfMeta || null,
//     pdfValidation: generationArtifact?.pdfValidation || null,
//     mergedDocxValidation: generationArtifact?.mergedDocxValidation || null,
//   },
//   fallbackUsed,
// });

// const runOrderGeneration = async (report, job) => {
//   console.log(`${LOG_PREFIX} entered job=${job._id}`);

//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};
//   const generationPolicy = documentConfig.generationPolicy || {};

//   const signaturePlacementOptions = {
//     markerText:
//       typeof generationPolicy.signaturePlacementMarkerText === "string"
//         ? generationPolicy.signaturePlacementMarkerText
//         : "__SIGNATURE_START__",
//     minTextBeforeMarkerLength: Number.isInteger(
//       generationPolicy.minTextBeforeMarkerLength,
//     )
//       ? generationPolicy.minTextBeforeMarkerLength
//       : 120,
//     minBodySignalScore: Number.isInteger(generationPolicy.minBodySignalScore)
//       ? generationPolicy.minBodySignalScore
//       : 1,
//   };

//   const maxFinalFallbackAttempts = Number.isInteger(
//     generationPolicy.maxFinalFallbackAttempts,
//   )
//     ? generationPolicy.maxFinalFallbackAttempts
//     : 1;

//   const finalDocxPath = buildFinalDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   const tempArtifacts = [];
//   const fallbackArtifacts = [];

//   console.log(
//     `${LOG_PREFIX} config loaded job=${job._id} orderProfiles=${orderProfiles.length} approvalProfiles=${approvalProfiles.length}`,
//   );
//   console.log(`${LOG_PREFIX} finalDocxPath=${finalDocxPath}`);
//   console.log(`${LOG_PREFIX} finalPdfPath=${finalPdfPath}`);
//   console.log(
//     `${LOG_PREFIX} signaturePlacementOptions=${JSON.stringify(signaturePlacementOptions)}`,
//   );
//   console.log(
//     `${LOG_PREFIX} maxFinalFallbackAttempts=${maxFinalFallbackAttempts}`,
//   );
//   console.log(
//     `${LOG_PREFIX} requested printSettings=${JSON.stringify(payload?.printSettings || null)}`,
//   );

//   try {
//     console.log(
//       `${LOG_PREFIX} starting order candidate selection job=${job._id}`,
//     );

//     const orderSelection = await findNextGoodOrderCandidate({
//       payload,
//       job,
//       orderProfiles,
//       signaturePlacementOptions,
//       startIndex: 0,
//     });

//     tempArtifacts.push(...(orderSelection.artifacts || []));

//     const selectedOrder = orderSelection.selected;

//     if (!selectedOrder) {
//       throw new Error("No good order profile found");
//     }

//     console.log(
//       `${LOG_PREFIX} selected order profile=${selectedOrder.profileName} index=${selectedOrder.profileIndex}`,
//     );

//     console.log(`${LOG_PREFIX} starting approval selection job=${job._id}`);

//     const approvalResult = await runApprovalSelection({
//       payload,
//       job,
//       profiles: approvalProfiles,
//     });

//     tempArtifacts.push(...(approvalResult.artifacts || []));

//     console.log(
//       `${LOG_PREFIX} selected approval profile=${approvalResult.profileName}`,
//     );

//     let activeOrderResult = {
//       status: "passed",
//       profileName: selectedOrder.profileName,
//       profile: selectedOrder.profile,
//       pages: selectedOrder.pages,
//       signaturePlacement: selectedOrder.signaturePlacement,
//       docxPath: selectedOrder.docxPath,
//       pdfPath: selectedOrder.pdfPath,
//       profileIndex: selectedOrder.profileIndex,
//     };

//     let finalProfile = {
//       orderProfile: activeOrderResult.profile,
//       approvalProfile: approvalResult.profile,
//     };

//     await cleanupFileIfExists(finalDocxPath);
//     await cleanupFileIfExists(finalPdfPath);

//     const cleanOrderSource = await prepareCleanFinalOrderSource({
//       job,
//       sourceDocxPath: activeOrderResult.docxPath,
//       artifacts: tempArtifacts,
//       suffix: "order_final_source",
//     });

//     let generationArtifact = await generateFinalOrderArtifact({
//       payload,
//       outputPath: finalDocxPath,
//       finalProfile,
//       orderSource: {
//         docxPath: cleanOrderSource.docxPath,
//         pdfPath: cleanOrderSource.pdfPath,
//       },
//       approvalSource: {
//         docxPath: approvalResult.docxPath,
//         pdfPath: approvalResult.pdfPath,
//       },
//     });

//     console.log(
//       `${LOG_PREFIX} generated final artifact meta=${JSON.stringify({
//         pdfMeta: generationArtifact?.pdfMeta || null,
//         preparedPrintSettings:
//           generationArtifact?.preparedPrintSettings || null,
//         assemblerPrintSettings:
//           generationArtifact?.assemblerPrintSettings || null,
//       })}`,
//     );

//     let finalEvaluation = await evaluateFinalDocument({
//       pdfPath: finalPdfPath,
//       payload,
//     });

//     let fallbackUsed = false;
//     let nextSearchIndex = activeOrderResult.profileIndex + 1;
//     let attempts = 0;

//     while (
//       finalEvaluation.hasDetachedSignature &&
//       attempts < maxFinalFallbackAttempts
//     ) {
//       attempts += 1;

//       console.warn(
//         `${LOG_PREFIX} final detached signature detected for profile=${activeOrderResult.profileName}; fallback attempt=${attempts}`,
//       );

//       const nextOrderSelection = await findNextGoodOrderCandidate({
//         payload,
//         job,
//         orderProfiles,
//         signaturePlacementOptions,
//         startIndex: nextSearchIndex,
//       });

//       tempArtifacts.push(...(nextOrderSelection.artifacts || []));

//       const nextOrder = nextOrderSelection.selected;

//       if (!nextOrder) {
//         console.warn(
//           `${LOG_PREFIX} no additional good order profile found for final fallback`,
//         );
//         break;
//       }

//       nextSearchIndex = nextOrder.profileIndex + 1;

//       activeOrderResult = {
//         status: "passed",
//         profileName: nextOrder.profileName,
//         profile: nextOrder.profile,
//         pages: nextOrder.pages,
//         signaturePlacement: nextOrder.signaturePlacement,
//         docxPath: nextOrder.docxPath,
//         pdfPath: nextOrder.pdfPath,
//         profileIndex: nextOrder.profileIndex,
//       };

//       finalProfile = {
//         orderProfile: activeOrderResult.profile,
//         approvalProfile: approvalResult.profile,
//       };

//       const fallbackFinalDocxPath = buildFinalCandidateDocxPath(
//         job,
//         `fallback_${attempts}`,
//       );
//       const fallbackFinalPdfPath = buildPdfPath(fallbackFinalDocxPath, pdfDir);

//       fallbackArtifacts.push(fallbackFinalDocxPath, fallbackFinalPdfPath);

//       await cleanupFileIfExists(fallbackFinalDocxPath);
//       await cleanupFileIfExists(fallbackFinalPdfPath);

//       const fallbackCleanOrderSource = await prepareCleanFinalOrderSource({
//         job,
//         sourceDocxPath: activeOrderResult.docxPath,
//         artifacts: tempArtifacts,
//         suffix: `order_final_source_fallback_${attempts}`,
//       });

//       const fallbackArtifact = await generateFinalOrderArtifact({
//         payload,
//         outputPath: fallbackFinalDocxPath,
//         finalProfile,
//         orderSource: {
//           docxPath: fallbackCleanOrderSource.docxPath,
//           pdfPath: fallbackCleanOrderSource.pdfPath,
//         },
//         approvalSource: {
//           docxPath: approvalResult.docxPath,
//           pdfPath: approvalResult.pdfPath,
//         },
//       });

//       const fallbackPdfPath = fallbackArtifact?.pdfPath || fallbackFinalPdfPath;

//       const fallbackEvaluation = await evaluateFinalDocument({
//         pdfPath: fallbackPdfPath,
//         payload,
//       });

//       if (!fallbackEvaluation.hasDetachedSignature) {
//         await cleanupFileIfExists(finalDocxPath);
//         await cleanupFileIfExists(finalPdfPath);
//         await fs.copyFile(fallbackFinalDocxPath, finalDocxPath);
//         await fs.copyFile(fallbackPdfPath, finalPdfPath);

//         finalEvaluation = fallbackEvaluation;
//         generationArtifact = {
//           ...fallbackArtifact,
//           docxPath: finalDocxPath,
//           pdfPath: finalPdfPath,
//           pdfMeta: fallbackArtifact?.pdfMeta
//             ? {
//                 ...fallbackArtifact.pdfMeta,
//                 outputPdfPath: finalPdfPath,
//               }
//             : null,
//           pdfValidation: fallbackArtifact?.pdfValidation
//             ? {
//                 ...fallbackArtifact.pdfValidation,
//                 pdfPath: finalPdfPath,
//               }
//             : null,
//         };
//         fallbackUsed = true;
//         break;
//       }
//     }

//     console.log(`${LOG_PREFIX} completed job=${job._id}`);
//     console.log(
//       `${LOG_PREFIX} final output docx=${finalDocxPath} pdf=${finalPdfPath}`,
//     );

//     return buildFinalResult({
//       finalDocxPath,
//       finalPdfPath,
//       orderResult: activeOrderResult,
//       approvalResult,
//       finalProfile,
//       finalEvaluation,
//       fallbackUsed,
//       generationArtifact,
//     });
//   } catch (error) {
//     console.error(`${LOG_PREFIX} failed job=${job._id}`);
//     console.error(error);
//     throw error;
//   } finally {
//     console.log(`${LOG_PREFIX} finally start job=${job._id}`);

//     if (DEBUG_KEEP_ARTIFACTS) {
//       console.log(
//         `${LOG_PREFIX} cleanup skipped because DEBUG_KEEP_ARTIFACTS=true`,
//       );
//     } else {
//       await sleep(1000);
//       await cleanupArtifacts([...tempArtifacts, ...fallbackArtifacts]);
//       console.log(`${LOG_PREFIX} cleanup completed job=${job._id}`);
//     }

//     console.log(`${LOG_PREFIX} finally end job=${job._id}`);
//   }
// };

// module.exports = runOrderGeneration;
// const fs = require("fs/promises");
// const path = require("path");

// const { convertToPdf } = require("../pdf");
// const { applyDocumentPaginationFixes } = require("../word");
// const validateLayout = require("./validateLayout");
// const detectDetachedSignature = require("../generation/detectDetachedSignature");
// const documents = require("../documents");
// const order = require("../documents/order");
// const { tryBottomMarginFallback } = require("./tryBottomMarginFallback");

// const LOG_PREFIX = "[runOrderGeneration]";
// const DEBUG_KEEP_ARTIFACTS = false;

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// const buildFinalCandidateDocxPath = (job, suffix) =>
//   path.join(
//     process.cwd(),
//     "storage",
//     "docx",
//     `${job._id}_nakaz_${suffix}.docx`,
//   );

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath, options = {}) => {
//   const retries = Number.isInteger(options.retries) ? options.retries : 6;
//   const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 500;

//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       await fs.unlink(filePath);
//       console.log(`${LOG_PREFIX} cleaned file=${filePath}`);
//       return true;
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return true;
//       }

//       const isLastAttempt = attempt === retries;
//       const isRetryable =
//         error.code === "EBUSY" ||
//         error.code === "EPERM" ||
//         error.code === "EACCES";

//       if (!isRetryable || isLastAttempt) {
//         console.warn(
//           `${LOG_PREFIX} cleanup failed file=${filePath} code=${error.code}`,
//         );
//         console.warn(error.message);
//         return false;
//       }

//       console.warn(
//         `${LOG_PREFIX} cleanup retry file=${filePath} code=${error.code} attempt=${attempt + 1}/${retries + 1}`,
//       );

//       await sleep(delayMs);
//     }
//   }

//   return false;
// };

// const replaceFile = async (sourcePath, targetPath) => {
//   if (!sourcePath || !targetPath) {
//     throw new Error("replaceFile: sourcePath and targetPath are required");
//   }

//   if (sourcePath === targetPath) {
//     return targetPath;
//   }

//   await cleanupFileIfExists(targetPath);
//   await fs.rename(sourcePath, targetPath);

//   return targetPath;
// };

// const cleanupArtifacts = async (paths) => {
//   const uniquePaths = [...new Set(paths.filter(Boolean))];

//   console.log(
//     `${LOG_PREFIX} cleanupArtifacts start count=${uniquePaths.length}`,
//   );

//   for (const filePath of uniquePaths) {
//     await cleanupFileIfExists(filePath);
//   }

//   console.log(`${LOG_PREFIX} cleanupArtifacts end`);
// };

// const formatSignerDate = (value) => {
//   if (!value) return "";

//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return "";

//   return date.toLocaleDateString("uk-UA", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   });
// };

// const buildValidationContext = (payload, label) => {
//   if (label === "order") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "order",
//       expectedBottomMarginCm: 2.0,
//       minAllowedBottomMarginCm: 1.9,
//       maxAllowedBottomMarginCm: 3.2,
//       systemicWhitespaceThresholdCm: 2.2,
//       systemicWhitespaceMinShare: 0.5,
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
//       expectedBottomMarginCm: 2.0,
//       minAllowedBottomMarginCm: 1.9,
//       maxAllowedBottomMarginCm: 3.2,
//       systemicWhitespaceThresholdCm: 2.2,
//       systemicWhitespaceMinShare: 0.5,
//       markers: {},
//     };
//   }

//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
//       expectedBottomMarginCm: 2.0,
//       minAllowedBottomMarginCm: 1.9,
//       maxAllowedBottomMarginCm: 3.2,
//       systemicWhitespaceThresholdCm: 2.2,
//       systemicWhitespaceMinShare: 0.5,
//       markers: {
//         proshu: "ПРОШУ:",
//         foundationPhrase: "На підставі вищезазначеного,",
//         signerPosition: signer.position,
//         signerMilitaryUnit: signer.militaryUnit,
//         signerRank: signer.rank,
//         signerFullName: signer.fullName,
//         signerDate: signer.date,
//         signerDateFormatted: formatSignerDate(signer.date),
//       },
//     };
//   }

//   return {
//     documentType: label || payload.documentType,
//     expectedBottomMarginCm: 2.0,
//     minAllowedBottomMarginCm: 1.9,
//     maxAllowedBottomMarginCm: 3.2,
//     systemicWhitespaceThresholdCm: 2.2,
//     systemicWhitespaceMinShare: 0.5,
//     markers: {},
//   };
// };

// const validateCandidateLayout = async (pdfPath, payload, label) => {
//   const validationContext = buildValidationContext(payload, label);
//   return validateLayout(pdfPath, validationContext);
// };

// const applyOrderPaginationFixesToFile = async (docxPath, profile) => {
//   console.log(
//     `${LOG_PREFIX} applyOrderPaginationFixesToFile start docxPath=${docxPath}`,
//   );

//   const generatedDocxBuffer = await fs.readFile(docxPath);

//   const fixedDocxBuffer = applyDocumentPaginationFixes(generatedDocxBuffer, {
//     documentType: "order",
//     orderFormatting: profile?.orderFormatting,
//   });

//   await fs.writeFile(docxPath, fixedDocxBuffer);

//   console.log(
//     `${LOG_PREFIX} applyOrderPaginationFixesToFile done docxPath=${docxPath}`,
//   );
// };

// const evaluateOrderCandidate = async ({
//   payload,
//   job,
//   pdfDir,
//   profile,
//   profileIndex,
// }) => {
//   const docxPath = buildDocxPath(job, `order_candidate_${profileIndex + 1}`);
//   const pdfPath = buildPdfPath(docxPath, pdfDir);
//   const artifacts = [docxPath, pdfPath];
//   const candidateStartedAt = Date.now();

//   try {
//     console.log(
//       `${LOG_PREFIX} order-candidate-start profile=${profile.name} index=${profileIndex}`,
//     );

//     await ensureParentDir(docxPath);
//     await cleanupFileIfExists(docxPath);
//     await cleanupFileIfExists(pdfPath);

//     const docxStartedAt = Date.now();
//     await order.generateOrderOnlyDocument(payload, docxPath, profile);

//     await applyOrderPaginationFixesToFile(docxPath, profile);

//     const pdfStartedAt = Date.now();
//     await convertToPdf(docxPath, pdfDir);

//     const validateStartedAt = Date.now();
//     const layout = await validateCandidateLayout(pdfPath, payload, "order");

//     console.log(
//       `${LOG_PREFIX} order-candidate-timings profile=${profile.name} docxMs=${pdfStartedAt - docxStartedAt} pdfMs=${validateStartedAt - pdfStartedAt} validateMs=${Date.now() - validateStartedAt} totalMs=${Date.now() - candidateStartedAt}`,
//     );

//     console.log(
//       `${LOG_PREFIX} order-candidate-summary profile=${profile.name} passed=${layout.passed} hard=${layout.hardViolations.length} margin=${layout.marginViolations.length} systemicWhitespace=${layout.systemicWhitespace?.triggered} whitespaceScore=${layout.systemicWhitespace?.score}`,
//     );

//     console.log(
//       `${LOG_PREFIX} order-candidate-hard-codes profile=${profile.name} codes=${JSON.stringify(layout.hardViolations.map((v) => v.code))}`,
//     );

//     return {
//       ok: true,
//       profileName: profile.name,
//       profile,
//       profileIndex,
//       pages: layout.pages,
//       hardViolations: layout.hardViolations,
//       marginViolations: layout.marginViolations,
//       hasLayoutError: !layout.passed,
//       docxPath,
//       pdfPath,
//       layout,
//       layoutFlags: layout.layoutFlags,
//       systemicWhitespace: layout.systemicWhitespace,
//       artifacts,
//     };
//   } catch (error) {
//     console.error(
//       `${LOG_PREFIX} order-candidate-failed profile=${profile.name} index=${profileIndex}`,
//     );
//     console.error(error);

//     return {
//       ok: false,
//       profileName: profile.name,
//       profile,
//       profileIndex,
//       pages: [],
//       hardViolations: [],
//       marginViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath,
//       layout: null,
//       layoutFlags: null,
//       systemicWhitespace: null,
//       artifacts,
//     };
//   }
// };

// const prepareCleanFinalOrderSource = async ({
//   job,
//   sourceDocxPath,
//   artifacts,
//   suffix = "order_final_source",
//   orderFormatting = null,
// }) => {
//   const pdfDir = buildPdfDir();
//   const cleanDocxPath = buildDocxPath(job, suffix);
//   const cleanPdfPath = buildPdfPath(cleanDocxPath, pdfDir);

//   console.log(
//     `${LOG_PREFIX} prepareCleanFinalOrderSource start sourceDocxPath=${sourceDocxPath} suffix=${suffix}`,
//   );

//   await cleanupFileIfExists(cleanDocxPath);
//   await cleanupFileIfExists(cleanPdfPath);

//   const sourceBuffer = await fs.readFile(sourceDocxPath);
//   const cleanedBuffer = applyDocumentPaginationFixes(sourceBuffer, {
//     documentType: "order",
//     orderFormatting,
//   });

//   await ensureParentDir(cleanDocxPath);
//   await fs.writeFile(cleanDocxPath, cleanedBuffer);

//   await convertToPdf(cleanDocxPath, pdfDir);

//   if (Array.isArray(artifacts)) {
//     artifacts.push(cleanDocxPath, cleanPdfPath);
//   }

//   return {
//     docxPath: cleanDocxPath,
//     pdfPath: cleanPdfPath,
//   };
// };

// const findNextGoodOrderCandidate = async ({
//   payload,
//   job,
//   orderProfiles,
//   startIndex = 0,
// }) => {
//   console.log(
//     `${LOG_PREFIX} findNextGoodOrderCandidate start startIndex=${startIndex} totalProfiles=${orderProfiles.length}`,
//   );

//   const pdfDir = buildPdfDir();
//   const artifacts = [];
//   const preservedArtifacts = new Set();

//   try {
//     for (let index = startIndex; index < orderProfiles.length; index++) {
//       const profile = orderProfiles[index];

//       console.log(
//         `${LOG_PREFIX} trying order profile index=${index} profile=${profile.name}`,
//       );

//       const result = await evaluateOrderCandidate({
//         payload,
//         job,
//         pdfDir,
//         profile,
//         profileIndex: index,
//       });

//       artifacts.push(...(result.artifacts || []));

//       if (!result.ok) {
//         console.warn(
//           `${LOG_PREFIX} continue-after-order-profile profile=${profile.name} reason=candidate_failed`,
//         );
//         continue;
//       }

//       const markerOk = Boolean(result.layoutFlags?.nakazuiuOk);
//       const signatureOk = Boolean(result.layoutFlags?.signatureOk);
//       const systemicWhitespace = Boolean(result.systemicWhitespace?.triggered);

//       console.log(
//         `${LOG_PREFIX} order-candidate-flags profile=${result.profileName} markerOk=${markerOk} signatureOk=${signatureOk} systemicWhitespace=${systemicWhitespace} whitespaceScore=${result.systemicWhitespace?.score ?? "n/a"}`,
//       );

//       if (!markerOk || !signatureOk) {
//         console.warn(
//           `${LOG_PREFIX} continue-after-order-profile profile=${result.profileName} reason=critical_layout_block_failed markerOk=${markerOk} signatureOk=${signatureOk}`,
//         );
//         continue;
//       }

//       if (!systemicWhitespace) {
//         preservedArtifacts.add(result.docxPath);
//         preservedArtifacts.add(result.pdfPath);

//         console.log(
//           `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=base reason=base_ok_no_systemic_tail`,
//         );

//         return {
//           selected: {
//             status: result.hasLayoutError ? "best_effort" : "passed",
//             profileName: result.profileName,
//             profile: result.profile,
//             profileIndex: result.profileIndex,
//             selectedVariant: "base",
//             pages: result.pages,
//             hardViolations: result.hardViolations,
//             marginViolations: result.marginViolations,
//             docxPath: result.docxPath,
//             pdfPath: result.pdfPath,
//             layout: result.layout,
//             layoutFlags: result.layoutFlags,
//             systemicWhitespace: result.systemicWhitespace,
//           },
//           artifacts,
//           preservedArtifacts: [...preservedArtifacts],
//         };
//       }

//       const fallbackDecision = await tryBottomMarginFallback({
//         payload,
//         profileName: result.profileName,
//         baseDocxPath: result.docxPath,
//         pdfDir,
//         cleanupFileIfExists,
//         logger: console,
//       });

//       artifacts.push(...(fallbackDecision.artifacts || []));

//       console.warn(
//         `${LOG_PREFIX} order-bottom-margin-fallback profile=${result.profileName} decision=${fallbackDecision.decision} reason=${fallbackDecision.reason}`,
//       );

//       if (fallbackDecision.decision === "accept-base") {
//         preservedArtifacts.add(result.docxPath);
//         preservedArtifacts.add(result.pdfPath);

//         console.log(
//           `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=base reason=fallback_accept_base`,
//         );

//         return {
//           selected: {
//             status: fallbackDecision.base.layout.passed
//               ? "passed"
//               : "best_effort",
//             profileName: result.profileName,
//             profile: result.profile,
//             profileIndex: result.profileIndex,
//             selectedVariant: "base",
//             pages: fallbackDecision.base.layout.pages,
//             hardViolations: fallbackDecision.base.layout.hardViolations,
//             marginViolations: fallbackDecision.base.layout.marginViolations,
//             docxPath: result.docxPath,
//             pdfPath: result.pdfPath,
//             layout: fallbackDecision.base.layout,
//             layoutFlags: fallbackDecision.base.layout.layoutFlags,
//             systemicWhitespace: fallbackDecision.base.layout.systemicWhitespace,
//           },
//           artifacts,
//           preservedArtifacts: [...preservedArtifacts],
//         };
//       }

//       if (fallbackDecision.decision === "accept-alt") {
//         const finalDocxPath = result.docxPath;
//         const finalPdfPath = result.pdfPath;

//         await replaceFile(fallbackDecision.alt.docxPath, finalDocxPath);
//         await replaceFile(fallbackDecision.alt.pdfPath, finalPdfPath);

//         preservedArtifacts.add(finalDocxPath);
//         preservedArtifacts.add(finalPdfPath);

//         console.log(
//           `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=bottom1077 reason=accept_alt_bottom1077`,
//         );

//         return {
//           selected: {
//             status: fallbackDecision.alt.layout.passed
//               ? "passed"
//               : "best_effort",
//             profileName: result.profileName,
//             profile: result.profile,
//             profileIndex: result.profileIndex,
//             selectedVariant: "bottom1077",
//             pages: fallbackDecision.alt.layout.pages,
//             hardViolations: fallbackDecision.alt.layout.hardViolations,
//             marginViolations: fallbackDecision.alt.layout.marginViolations,
//             docxPath: finalDocxPath,
//             pdfPath: finalPdfPath,
//             layout: fallbackDecision.alt.layout,
//             layoutFlags: fallbackDecision.alt.layout.layoutFlags,
//             systemicWhitespace: fallbackDecision.alt.layout.systemicWhitespace,
//           },
//           artifacts,
//           preservedArtifacts: [...preservedArtifacts],
//         };
//       }

//       console.warn(
//         `${LOG_PREFIX} continue-after-order-profile profile=${result.profileName} reason=fallback_not_accepted`,
//       );
//     }

//     console.warn(
//       `${LOG_PREFIX} no good order profile found starting from index=${startIndex}`,
//     );

//     return {
//       selected: null,
//       artifacts,
//       preservedArtifacts: [...preservedArtifacts],
//     };
//   } catch (error) {
//     console.error(`${LOG_PREFIX} findNextGoodOrderCandidate failed`);
//     console.error(error);

//     return {
//       selected: null,
//       artifacts,
//       preservedArtifacts: [...preservedArtifacts],
//     };
//   }
// };

// const runApprovalSelection = async ({ payload, job, profiles }) => {
//   if (!profiles.length) {
//     throw new Error("No approval profiles configured");
//   }

//   const docxPath = buildDocxPath(job, "approval");
//   const pdfDir = buildPdfDir();

//   let bestResult = null;

//   console.log(
//     `${LOG_PREFIX} runApprovalSelection start totalProfiles=${profiles.length}`,
//   );

//   for (const profile of profiles) {
//     try {
//       console.log(
//         `${LOG_PREFIX} approval evaluate start profile=${profile.name}`,
//       );

//       await ensureParentDir(docxPath);
//       await cleanupFileIfExists(docxPath);
//       await cleanupFileIfExists(buildPdfPath(docxPath, pdfDir));

//       await order.generateApprovalOnlyDocument(payload, docxPath, profile);
//       await convertToPdf(docxPath, pdfDir);

//       const pdfPath = buildPdfPath(docxPath, pdfDir);
//       const layout = await validateCandidateLayout(
//         pdfPath,
//         payload,
//         "approval",
//       );

//       const result = {
//         status: layout.passed ? "passed" : "best_effort",
//         profileName: profile.name,
//         profile,
//         pages: layout.pages,
//         docxPath,
//         pdfPath,
//         artifacts: [docxPath, pdfPath],
//       };

//       if (layout.pages.length !== 1) {
//         if (!bestResult || bestResult.pages.length !== 1) {
//           bestResult = result;
//         }
//         continue;
//       }

//       if (layout.passed) {
//         return result;
//       }

//       if (!bestResult) {
//         bestResult = result;
//       }
//     } catch (error) {
//       console.error(
//         `${LOG_PREFIX} approval candidate failed profile=${profile.name}`,
//       );
//       console.error(error);
//     }
//   }

//   if (bestResult && bestResult.pages.length === 1) {
//     return bestResult;
//   }

//   throw new Error("No valid approval profile could be generated");
// };

// const generateFinalOrderArtifact = async ({
//   payload,
//   outputPath,
//   finalProfile,
//   orderSource,
//   approvalSource,
// }) => {
//   await ensureParentDir(outputPath);

//   return order.generateOrderDocument({
//     payload,
//     outputPath,
//     profile: finalProfile,
//     orderSource,
//     approvalSource,
//   });
// };

// const evaluateFinalDocument = async ({ pdfPath, payload }) => {
//   const layoutResult = await validateLayout(pdfPath, {
//     documentType: "order_print_pdf",
//     markers: {},
//   });

//   const pages = Array.isArray(layoutResult?.pages) ? layoutResult.pages : [];
//   const hardViolations = Array.isArray(layoutResult?.hardViolations)
//     ? layoutResult.hardViolations
//     : [];

//   const hasLayoutError = hardViolations.length > 0;

//   let signatureCheck = {
//     detached: false,
//     reason: "final_signature_check_skipped_for_print_pdf",
//     debug: {},
//   };

//   try {
//     if (typeof detectDetachedSignature === "function") {
//       signatureCheck = await detectDetachedSignature(pdfPath, payload);
//     }
//   } catch (error) {
//     console.warn(`${LOG_PREFIX} detectDetachedSignature failed`);
//     console.warn(error);
//   }

//   return {
//     pages,
//     hardViolations,
//     hasLayoutError,
//     signatureCheck,
//     hasDetachedSignature: Boolean(signatureCheck?.detached),
//   };
// };

// const buildFinalResult = ({
//   finalDocxPath,
//   finalPdfPath,
//   orderResult,
//   approvalResult,
//   finalProfile,
//   finalEvaluation,
//   fallbackUsed,
//   generationArtifact,
// }) => ({
//   status:
//     !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//       ? "passed"
//       : "best_effort",
//   profile: {
//     orderProfile: orderResult.profileName,
//     approvalProfile: approvalResult.profileName,
//   },
//   layoutCheck: {
//     order: {
//       status: orderResult.status || "passed",
//       profile: orderResult.profileName,
//       variant: orderResult.selectedVariant || "base",
//       pages: orderResult.pages,
//       layoutFlags: orderResult.layoutFlags || null,
//       systemicWhitespace: orderResult.systemicWhitespace || null,
//     },
//     approval: {
//       status: approvalResult.status,
//       profile: approvalResult.profileName,
//       pages: approvalResult.pages,
//     },
//     finalOrder: {
//       status:
//         !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//           ? "passed"
//           : "best_effort",
//       profile: orderResult.profileName,
//       pages: finalEvaluation.pages,
//       hardViolations: finalEvaluation.hardViolations,
//       detachedSignature: finalEvaluation.hasDetachedSignature,
//       detachedSignatureReason: finalEvaluation.signatureCheck?.reason || null,
//       detachedSignatureDebug: finalEvaluation.signatureCheck?.debug || {},
//     },
//   },
//   resolvedProfile: finalProfile,
//   outputPath: finalPdfPath,
//   pdfPath: finalPdfPath,
//   docxPath: finalDocxPath,
//   generationResult: {
//     docxPath: finalDocxPath,
//     pdfPath: finalPdfPath,
//     preparedPrintSettings: generationArtifact?.preparedPrintSettings || null,
//     assemblerPrintSettings: generationArtifact?.assemblerPrintSettings || null,
//     pdfMeta: generationArtifact?.pdfMeta || null,
//     pdfValidation: generationArtifact?.pdfValidation || null,
//     mergedDocxValidation: generationArtifact?.mergedDocxValidation || null,
//   },
//   fallbackUsed,
// });

// const runOrderGeneration = async (report, job) => {
//   console.log(`${LOG_PREFIX} entered job=${job._id}`);

//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};
//   const generationPolicy = documentConfig.generationPolicy || {};

//   const maxFinalFallbackAttempts = Number.isInteger(
//     generationPolicy.maxFinalFallbackAttempts,
//   )
//     ? generationPolicy.maxFinalFallbackAttempts
//     : 1;

//   const finalDocxPath = buildFinalDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   const tempArtifacts = [];
//   const fallbackArtifacts = [];
//   const preservedArtifacts = new Set();

//   console.log(
//     `${LOG_PREFIX} config loaded job=${job._id} orderProfiles=${orderProfiles.length} approvalProfiles=${approvalProfiles.length}`,
//   );
//   console.log(`${LOG_PREFIX} finalDocxPath=${finalDocxPath}`);
//   console.log(`${LOG_PREFIX} finalPdfPath=${finalPdfPath}`);
//   console.log(
//     `${LOG_PREFIX} maxFinalFallbackAttempts=${maxFinalFallbackAttempts}`,
//   );
//   console.log(
//     `${LOG_PREFIX} requested printSettings=${JSON.stringify(payload?.printSettings || null)}`,
//   );

//   try {
//     const orderSelection = await findNextGoodOrderCandidate({
//       payload,
//       job,
//       orderProfiles,
//       startIndex: 0,
//     });

//     tempArtifacts.push(...(orderSelection.artifacts || []));
//     for (const filePath of orderSelection.preservedArtifacts || []) {
//       preservedArtifacts.add(filePath);
//     }

//     const selectedOrder = orderSelection.selected;

//     if (!selectedOrder) {
//       throw new Error("No good order profile found");
//     }

//     console.log(
//       `${LOG_PREFIX} selected order profile=${selectedOrder.profileName} index=${selectedOrder.profileIndex} variant=${selectedOrder.selectedVariant}`,
//     );

//     const approvalResult = await runApprovalSelection({
//       payload,
//       job,
//       profiles: approvalProfiles,
//     });

//     tempArtifacts.push(...(approvalResult.artifacts || []));
//     preservedArtifacts.add(approvalResult.docxPath);
//     preservedArtifacts.add(approvalResult.pdfPath);

//     console.log(
//       `${LOG_PREFIX} selected approval profile=${approvalResult.profileName}`,
//     );

//     let activeOrderResult = {
//       status: selectedOrder.status || "passed",
//       profileName: selectedOrder.profileName,
//       profile: selectedOrder.profile,
//       selectedVariant: selectedOrder.selectedVariant,
//       pages: selectedOrder.pages,
//       layout: selectedOrder.layout,
//       layoutFlags: selectedOrder.layoutFlags,
//       systemicWhitespace: selectedOrder.systemicWhitespace,
//       docxPath: selectedOrder.docxPath,
//       pdfPath: selectedOrder.pdfPath,
//       profileIndex: selectedOrder.profileIndex,
//     };

//     let finalProfile = {
//       orderProfile: activeOrderResult.profile,
//       approvalProfile: approvalResult.profile,
//     };

//     await cleanupFileIfExists(finalDocxPath);
//     await cleanupFileIfExists(finalPdfPath);

//     const cleanOrderSource = await prepareCleanFinalOrderSource({
//       job,
//       sourceDocxPath: activeOrderResult.docxPath,
//       artifacts: tempArtifacts,
//       suffix: "order_final_source",
//       orderFormatting: activeOrderResult?.profile?.orderFormatting || null,
//     });

//     let generationArtifact = await generateFinalOrderArtifact({
//       payload,
//       outputPath: finalDocxPath,
//       finalProfile,
//       orderSource: {
//         docxPath: cleanOrderSource.docxPath,
//         pdfPath: cleanOrderSource.pdfPath,
//       },
//       approvalSource: {
//         docxPath: approvalResult.docxPath,
//         pdfPath: approvalResult.pdfPath,
//       },
//     });

//     let finalEvaluation = await evaluateFinalDocument({
//       pdfPath: finalPdfPath,
//       payload,
//     });

//     let fallbackUsed = false;
//     let nextSearchIndex = activeOrderResult.profileIndex + 1;
//     let attempts = 0;

//     while (
//       finalEvaluation.hasDetachedSignature &&
//       attempts < maxFinalFallbackAttempts
//     ) {
//       attempts += 1;

//       console.warn(
//         `${LOG_PREFIX} final detached signature detected for profile=${activeOrderResult.profileName}; fallback attempt=${attempts}`,
//       );

//       const nextOrderSelection = await findNextGoodOrderCandidate({
//         payload,
//         job,
//         orderProfiles,
//         startIndex: nextSearchIndex,
//       });

//       tempArtifacts.push(...(nextOrderSelection.artifacts || []));
//       for (const filePath of nextOrderSelection.preservedArtifacts || []) {
//         preservedArtifacts.add(filePath);
//       }

//       const nextOrder = nextOrderSelection.selected;

//       if (!nextOrder) {
//         console.warn(
//           `${LOG_PREFIX} no additional good order profile found for final fallback`,
//         );
//         break;
//       }

//       nextSearchIndex = nextOrder.profileIndex + 1;

//       activeOrderResult = {
//         status: nextOrder.status || "passed",
//         profileName: nextOrder.profileName,
//         profile: nextOrder.profile,
//         selectedVariant: nextOrder.selectedVariant,
//         pages: nextOrder.pages,
//         layout: nextOrder.layout,
//         layoutFlags: nextOrder.layoutFlags,
//         systemicWhitespace: nextOrder.systemicWhitespace,
//         docxPath: nextOrder.docxPath,
//         pdfPath: nextOrder.pdfPath,
//         profileIndex: nextOrder.profileIndex,
//       };

//       finalProfile = {
//         orderProfile: activeOrderResult.profile,
//         approvalProfile: approvalResult.profile,
//       };

//       const fallbackFinalDocxPath = buildFinalCandidateDocxPath(
//         job,
//         `fallback_${attempts}`,
//       );
//       const fallbackFinalPdfPath = buildPdfPath(fallbackFinalDocxPath, pdfDir);

//       fallbackArtifacts.push(fallbackFinalDocxPath, fallbackFinalPdfPath);

//       await cleanupFileIfExists(fallbackFinalDocxPath);
//       await cleanupFileIfExists(fallbackFinalPdfPath);

//       const fallbackCleanOrderSource = await prepareCleanFinalOrderSource({
//         job,
//         sourceDocxPath: activeOrderResult.docxPath,
//         artifacts: tempArtifacts,
//         suffix: `order_final_source_fallback_${attempts}`,
//         orderFormatting: activeOrderResult?.profile?.orderFormatting || null,
//       });

//       const fallbackArtifact = await generateFinalOrderArtifact({
//         payload,
//         outputPath: fallbackFinalDocxPath,
//         finalProfile,
//         orderSource: {
//           docxPath: fallbackCleanOrderSource.docxPath,
//           pdfPath: fallbackCleanOrderSource.pdfPath,
//         },
//         approvalSource: {
//           docxPath: approvalResult.docxPath,
//           pdfPath: approvalResult.pdfPath,
//         },
//       });

//       const fallbackPdfPath = fallbackArtifact?.pdfPath || fallbackFinalPdfPath;

//       const fallbackEvaluation = await evaluateFinalDocument({
//         pdfPath: fallbackPdfPath,
//         payload,
//       });

//       if (!fallbackEvaluation.hasDetachedSignature) {
//         await cleanupFileIfExists(finalDocxPath);
//         await cleanupFileIfExists(finalPdfPath);
//         await fs.copyFile(fallbackFinalDocxPath, finalDocxPath);
//         await fs.copyFile(fallbackPdfPath, finalPdfPath);

//         finalEvaluation = fallbackEvaluation;
//         generationArtifact = {
//           ...fallbackArtifact,
//           docxPath: finalDocxPath,
//           pdfPath: finalPdfPath,
//           pdfMeta: fallbackArtifact?.pdfMeta
//             ? {
//                 ...fallbackArtifact.pdfMeta,
//                 outputPdfPath: finalPdfPath,
//               }
//             : null,
//           pdfValidation: fallbackArtifact?.pdfValidation
//             ? {
//                 ...fallbackArtifact.pdfValidation,
//                 pdfPath: finalPdfPath,
//               }
//             : null,
//         };
//         fallbackUsed = true;
//         break;
//       }
//     }

//     console.log(`${LOG_PREFIX} completed job=${job._id}`);
//     console.log(
//       `${LOG_PREFIX} final output docx=${finalDocxPath} pdf=${finalPdfPath}`,
//     );

//     return buildFinalResult({
//       finalDocxPath,
//       finalPdfPath,
//       orderResult: activeOrderResult,
//       approvalResult,
//       finalProfile,
//       finalEvaluation,
//       fallbackUsed,
//       generationArtifact,
//     });
//   } catch (error) {
//     console.error(`${LOG_PREFIX} failed job=${job._id}`);
//     console.error(error);
//     throw error;
//   } finally {
//     console.log(`${LOG_PREFIX} finally start job=${job._id}`);

//     if (DEBUG_KEEP_ARTIFACTS) {
//       console.log(
//         `${LOG_PREFIX} cleanup skipped because DEBUG_KEEP_ARTIFACTS=true`,
//       );
//     } else {
//       const artifactsToCleanup = [
//         ...new Set([...tempArtifacts, ...fallbackArtifacts]),
//       ].filter((filePath) => !preservedArtifacts.has(filePath));

//       if (artifactsToCleanup.length) {
//         await sleep(1000);
//         await cleanupArtifacts(artifactsToCleanup);
//       }

//       console.log(`${LOG_PREFIX} cleanup completed job=${job._id}`);
//     }

//     console.log(`${LOG_PREFIX} finally end job=${job._id}`);
//   }
// };

// module.exports = runOrderGeneration;
// const fs = require("fs/promises");
// const path = require("path");

// const { convertToPdf } = require("../pdf");
// const { applyDocumentPaginationFixes } = require("../word");
// const validateLayout = require("./validateLayout");
// const detectDetachedSignature = require("../generation/detectDetachedSignature");
// const documents = require("../documents");
// const order = require("../documents/order");
// const { tryBottomMarginFallback } = require("./tryBottomMarginFallback");

// const LOG_PREFIX = "[runOrderGeneration]";
// const DEBUG_KEEP_ARTIFACTS = false;

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// const buildFinalCandidateDocxPath = (job, suffix) =>
//   path.join(
//     process.cwd(),
//     "storage",
//     "docx",
//     `${job._id}_nakaz_${suffix}.docx`,
//   );

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const cleanupFileIfExists = async (filePath, options = {}) => {
//   const retries = Number.isInteger(options.retries) ? options.retries : 6;
//   const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 500;

//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       await fs.unlink(filePath);
//       console.log(`${LOG_PREFIX} cleaned file=${filePath}`);
//       return true;
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return true;
//       }

//       const isLastAttempt = attempt === retries;
//       const isRetryable =
//         error.code === "EBUSY" ||
//         error.code === "EPERM" ||
//         error.code === "EACCES";

//       if (!isRetryable || isLastAttempt) {
//         console.warn(
//           `${LOG_PREFIX} cleanup failed file=${filePath} code=${error.code}`,
//         );
//         console.warn(error.message);
//         return false;
//       }

//       console.warn(
//         `${LOG_PREFIX} cleanup retry file=${filePath} code=${error.code} attempt=${attempt + 1}/${retries + 1}`,
//       );

//       await sleep(delayMs);
//     }
//   }

//   return false;
// };

// const replaceFile = async (sourcePath, targetPath) => {
//   if (!sourcePath || !targetPath) {
//     throw new Error("replaceFile: sourcePath and targetPath are required");
//   }

//   if (sourcePath === targetPath) {
//     return targetPath;
//   }

//   await cleanupFileIfExists(targetPath);
//   await fs.rename(sourcePath, targetPath);

//   return targetPath;
// };

// const cleanupArtifacts = async (paths) => {
//   const uniquePaths = [...new Set(paths.filter(Boolean))];

//   console.log(
//     `${LOG_PREFIX} cleanupArtifacts start count=${uniquePaths.length}`,
//   );

//   for (const filePath of uniquePaths) {
//     await cleanupFileIfExists(filePath);
//   }

//   console.log(`${LOG_PREFIX} cleanupArtifacts end`);
// };

// const cleanupJobArtifactsByPrefix = async (
//   jobId,
//   { keepDocxNames = [], keepPdfNames = [] } = {},
// ) => {
//   const docxDir = path.join(process.cwd(), "storage", "docx");
//   const pdfDir = path.join(process.cwd(), "storage", "pdf");

//   const keepDocxSet = new Set(keepDocxNames.filter(Boolean));
//   const keepPdfSet = new Set(keepPdfNames.filter(Boolean));

//   const cleanupDir = async (dirPath, keepSet) => {
//     let entries = [];

//     try {
//       entries = await fs.readdir(dirPath, { withFileTypes: true });
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         return;
//       }
//       throw error;
//     }

//     for (const entry of entries) {
//       if (!entry.isFile()) continue;
//       if (!entry.name.startsWith(`${jobId}_`)) continue;
//       if (keepSet.has(entry.name)) continue;

//       const fullPath = path.join(dirPath, entry.name);
//       console.log(
//         `${LOG_PREFIX} cleanupJobArtifactsByPrefix candidate=${fullPath}`,
//       );
//       await cleanupFileIfExists(fullPath);
//     }
//   };

//   console.log(`${LOG_PREFIX} cleanupJobArtifactsByPrefix start job=${jobId}`);

//   await cleanupDir(docxDir, keepDocxSet);
//   await cleanupDir(pdfDir, keepPdfSet);

//   console.log(`${LOG_PREFIX} cleanupJobArtifactsByPrefix end job=${jobId}`);
// };

// const formatSignerDate = (value) => {
//   if (!value) return "";

//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return "";

//   return date.toLocaleDateString("uk-UA", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   });
// };

// const buildValidationContext = (payload, label) => {
//   if (label === "order") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "order",
//       expectedBottomMarginCm: 2.0,
//       minAllowedBottomMarginCm: 1.9,
//       maxAllowedBottomMarginCm: 3.2,
//       systemicWhitespaceThresholdCm: 2.2,
//       systemicWhitespaceMinShare: 0.5,
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
//       expectedBottomMarginCm: 2.0,
//       minAllowedBottomMarginCm: 1.9,
//       maxAllowedBottomMarginCm: 3.2,
//       systemicWhitespaceThresholdCm: 2.2,
//       systemicWhitespaceMinShare: 0.5,
//       markers: {},
//     };
//   }

//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
//       expectedBottomMarginCm: 2.0,
//       minAllowedBottomMarginCm: 1.9,
//       maxAllowedBottomMarginCm: 3.2,
//       systemicWhitespaceThresholdCm: 2.2,
//       systemicWhitespaceMinShare: 0.5,
//       markers: {
//         proshu: "ПРОШУ:",
//         foundationPhrase: "На підставі вищезазначеного,",
//         signerPosition: signer.position,
//         signerMilitaryUnit: signer.militaryUnit,
//         signerRank: signer.rank,
//         signerFullName: signer.fullName,
//         signerDate: signer.date,
//         signerDateFormatted: formatSignerDate(signer.date),
//       },
//     };
//   }

//   return {
//     documentType: label || payload.documentType,
//     expectedBottomMarginCm: 2.0,
//     minAllowedBottomMarginCm: 1.9,
//     maxAllowedBottomMarginCm: 3.2,
//     systemicWhitespaceThresholdCm: 2.2,
//     systemicWhitespaceMinShare: 0.5,
//     markers: {},
//   };
// };

// const validateCandidateLayout = async (pdfPath, payload, label) => {
//   const validationContext = buildValidationContext(payload, label);
//   return validateLayout(pdfPath, validationContext);
// };

// const applyOrderPaginationFixesToFile = async (docxPath, profile, payload) => {
//   console.log(
//     `${LOG_PREFIX} applyOrderPaginationFixesToFile start docxPath=${docxPath}`,
//   );

//   const generatedDocxBuffer = await fs.readFile(docxPath);

//   const fixedDocxBuffer = applyDocumentPaginationFixes(generatedDocxBuffer, {
//     documentType: "order",
//     orderFormatting: profile?.orderFormatting,
//     orderTitleText: payload?.data?.orderDetails?.orderTitle || "",
//   });

//   await fs.writeFile(docxPath, fixedDocxBuffer);

//   console.log(
//     `${LOG_PREFIX} applyOrderPaginationFixesToFile done docxPath=${docxPath}`,
//   );
// };

// const evaluateOrderCandidate = async ({
//   payload,
//   job,
//   pdfDir,
//   profile,
//   profileIndex,
// }) => {
//   const docxPath = buildDocxPath(job, `order_candidate_${profileIndex + 1}`);
//   const pdfPath = buildPdfPath(docxPath, pdfDir);
//   const artifacts = [docxPath, pdfPath];
//   const candidateStartedAt = Date.now();

//   try {
//     console.log(
//       `${LOG_PREFIX} order-candidate-start profile=${profile.name} index=${profileIndex}`,
//     );

//     await ensureParentDir(docxPath);
//     await cleanupFileIfExists(docxPath);
//     await cleanupFileIfExists(pdfPath);

//     const docxStartedAt = Date.now();
//     await order.generateOrderOnlyDocument(payload, docxPath, profile);

//     await applyOrderPaginationFixesToFile(docxPath, profile, payload);

//     const pdfStartedAt = Date.now();
//     await convertToPdf(docxPath, pdfDir);

//     const validateStartedAt = Date.now();
//     const layout = await validateCandidateLayout(pdfPath, payload, "order");

//     console.log(
//       `${LOG_PREFIX} order-candidate-timings profile=${profile.name} docxMs=${pdfStartedAt - docxStartedAt} pdfMs=${validateStartedAt - pdfStartedAt} validateMs=${Date.now() - validateStartedAt} totalMs=${Date.now() - candidateStartedAt}`,
//     );

//     console.log(
//       `${LOG_PREFIX} order-candidate-summary profile=${profile.name} passed=${layout.passed} hard=${layout.hardViolations.length} margin=${layout.marginViolations.length} systemicWhitespace=${layout.systemicWhitespace?.triggered} whitespaceScore=${layout.systemicWhitespace?.score}`,
//     );

//     console.log(
//       `${LOG_PREFIX} order-candidate-hard-codes profile=${profile.name} codes=${JSON.stringify(layout.hardViolations.map((v) => v.code))}`,
//     );

//     return {
//       ok: true,
//       profileName: profile.name,
//       profile,
//       profileIndex,
//       pages: layout.pages,
//       hardViolations: layout.hardViolations,
//       marginViolations: layout.marginViolations,
//       hasLayoutError: !layout.passed,
//       docxPath,
//       pdfPath,
//       layout,
//       layoutFlags: layout.layoutFlags,
//       systemicWhitespace: layout.systemicWhitespace,
//       artifacts,
//     };
//   } catch (error) {
//     console.error(
//       `${LOG_PREFIX} order-candidate-failed profile=${profile.name} index=${profileIndex}`,
//     );
//     console.error(error);

//     return {
//       ok: false,
//       profileName: profile.name,
//       profile,
//       profileIndex,
//       pages: [],
//       hardViolations: [],
//       marginViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath,
//       layout: null,
//       layoutFlags: null,
//       systemicWhitespace: null,
//       artifacts,
//     };
//   }
// };

// const prepareCleanFinalOrderSource = async ({
//   job,
//   sourceDocxPath,
//   artifacts,
//   suffix = "order_final_source",
//   orderFormatting = null,
//   payload,
// }) => {
//   const pdfDir = buildPdfDir();
//   const cleanDocxPath = buildDocxPath(job, suffix);
//   const cleanPdfPath = buildPdfPath(cleanDocxPath, pdfDir);

//   console.log(
//     `${LOG_PREFIX} prepareCleanFinalOrderSource start sourceDocxPath=${sourceDocxPath} suffix=${suffix}`,
//   );

//   await cleanupFileIfExists(cleanDocxPath);
//   await cleanupFileIfExists(cleanPdfPath);

//   const sourceBuffer = await fs.readFile(sourceDocxPath);
//   const cleanedBuffer = applyDocumentPaginationFixes(sourceBuffer, {
//     documentType: "order",
//     orderFormatting,
//     orderTitleText: payload?.data?.orderDetails?.orderTitle || "",
//   });

//   await ensureParentDir(cleanDocxPath);
//   await fs.writeFile(cleanDocxPath, cleanedBuffer);

//   await convertToPdf(cleanDocxPath, pdfDir);

//   if (Array.isArray(artifacts)) {
//     artifacts.push(cleanDocxPath, cleanPdfPath);
//   }

//   return {
//     docxPath: cleanDocxPath,
//     pdfPath: cleanPdfPath,
//   };
// };

// const findNextGoodOrderCandidate = async ({
//   payload,
//   job,
//   orderProfiles,
//   startIndex = 0,
// }) => {
//   console.log(
//     `${LOG_PREFIX} findNextGoodOrderCandidate start startIndex=${startIndex} totalProfiles=${orderProfiles.length}`,
//   );

//   const pdfDir = buildPdfDir();
//   const artifacts = [];

//   try {
//     for (let index = startIndex; index < orderProfiles.length; index++) {
//       const profile = orderProfiles[index];

//       console.log(
//         `${LOG_PREFIX} trying order profile index=${index} profile=${profile.name}`,
//       );

//       const result = await evaluateOrderCandidate({
//         payload,
//         job,
//         pdfDir,
//         profile,
//         profileIndex: index,
//       });

//       artifacts.push(...(result.artifacts || []));

//       if (!result.ok) {
//         console.warn(
//           `${LOG_PREFIX} continue-after-order-profile profile=${profile.name} reason=candidate_failed`,
//         );
//         continue;
//       }

//       const markerOk = Boolean(result.layoutFlags?.nakazuiuOk);
//       const signatureOk = Boolean(result.layoutFlags?.signatureOk);
//       const systemicWhitespace = Boolean(result.systemicWhitespace?.triggered);

//       console.log(
//         `${LOG_PREFIX} order-candidate-flags profile=${result.profileName} markerOk=${markerOk} signatureOk=${signatureOk} systemicWhitespace=${systemicWhitespace} whitespaceScore=${result.systemicWhitespace?.score ?? "n/a"}`,
//       );

//       if (!markerOk || !signatureOk) {
//         console.warn(
//           `${LOG_PREFIX} continue-after-order-profile profile=${result.profileName} reason=critical_layout_block_failed markerOk=${markerOk} signatureOk=${signatureOk}`,
//         );
//         continue;
//       }

//       if (!systemicWhitespace) {
//         console.log(
//           `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=base reason=base_ok_no_systemic_tail`,
//         );

//         return {
//           selected: {
//             status: result.hasLayoutError ? "best_effort" : "passed",
//             profileName: result.profileName,
//             profile: result.profile,
//             profileIndex: result.profileIndex,
//             selectedVariant: "base",
//             pages: result.pages,
//             hardViolations: result.hardViolations,
//             marginViolations: result.marginViolations,
//             docxPath: result.docxPath,
//             pdfPath: result.pdfPath,
//             layout: result.layout,
//             layoutFlags: result.layoutFlags,
//             systemicWhitespace: result.systemicWhitespace,
//           },
//           artifacts,
//         };
//       }

//       const fallbackDecision = await tryBottomMarginFallback({
//         payload,
//         profileName: result.profileName,
//         baseDocxPath: result.docxPath,
//         pdfDir,
//         cleanupFileIfExists,
//         logger: console,
//       });

//       artifacts.push(...(fallbackDecision.artifacts || []));

//       console.warn(
//         `${LOG_PREFIX} order-bottom-margin-fallback profile=${result.profileName} decision=${fallbackDecision.decision} reason=${fallbackDecision.reason}`,
//       );

//       if (fallbackDecision.decision === "accept-base") {
//         console.log(
//           `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=base reason=fallback_accept_base`,
//         );

//         return {
//           selected: {
//             status: fallbackDecision.base.layout.passed
//               ? "passed"
//               : "best_effort",
//             profileName: result.profileName,
//             profile: result.profile,
//             profileIndex: result.profileIndex,
//             selectedVariant: "base",
//             pages: fallbackDecision.base.layout.pages,
//             hardViolations: fallbackDecision.base.layout.hardViolations,
//             marginViolations: fallbackDecision.base.layout.marginViolations,
//             docxPath: result.docxPath,
//             pdfPath: result.pdfPath,
//             layout: fallbackDecision.base.layout,
//             layoutFlags: fallbackDecision.base.layout.layoutFlags,
//             systemicWhitespace: fallbackDecision.base.layout.systemicWhitespace,
//           },
//           artifacts,
//         };
//       }

//       if (fallbackDecision.decision === "accept-alt") {
//         const finalDocxPath = result.docxPath;
//         const finalPdfPath = result.pdfPath;

//         await replaceFile(fallbackDecision.alt.docxPath, finalDocxPath);
//         await replaceFile(fallbackDecision.alt.pdfPath, finalPdfPath);

//         console.log(
//           `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=bottom1077 reason=accept_alt_bottom1077`,
//         );

//         return {
//           selected: {
//             status: fallbackDecision.alt.layout.passed
//               ? "passed"
//               : "best_effort",
//             profileName: result.profileName,
//             profile: result.profile,
//             profileIndex: result.profileIndex,
//             selectedVariant: "bottom1077",
//             pages: fallbackDecision.alt.layout.pages,
//             hardViolations: fallbackDecision.alt.layout.hardViolations,
//             marginViolations: fallbackDecision.alt.layout.marginViolations,
//             docxPath: finalDocxPath,
//             pdfPath: finalPdfPath,
//             layout: fallbackDecision.alt.layout,
//             layoutFlags: fallbackDecision.alt.layout.layoutFlags,
//             systemicWhitespace: fallbackDecision.alt.layout.systemicWhitespace,
//           },
//           artifacts,
//         };
//       }

//       console.warn(
//         `${LOG_PREFIX} continue-after-order-profile profile=${result.profileName} reason=fallback_not_accepted`,
//       );
//     }

//     console.warn(
//       `${LOG_PREFIX} no good order profile found starting from index=${startIndex}`,
//     );

//     return {
//       selected: null,
//       artifacts,
//     };
//   } catch (error) {
//     console.error(`${LOG_PREFIX} findNextGoodOrderCandidate failed`);
//     console.error(error);

//     return {
//       selected: null,
//       artifacts,
//     };
//   }
// };

// const runApprovalSelection = async ({ payload, job, profiles }) => {
//   if (!profiles.length) {
//     throw new Error("No approval profiles configured");
//   }

//   const docxPath = buildDocxPath(job, "approval");
//   const pdfDir = buildPdfDir();

//   let bestResult = null;

//   console.log(
//     `${LOG_PREFIX} runApprovalSelection start totalProfiles=${profiles.length}`,
//   );

//   for (const profile of profiles) {
//     try {
//       console.log(
//         `${LOG_PREFIX} approval evaluate start profile=${profile.name}`,
//       );

//       await ensureParentDir(docxPath);
//       await cleanupFileIfExists(docxPath);
//       await cleanupFileIfExists(buildPdfPath(docxPath, pdfDir));

//       await order.generateApprovalOnlyDocument(payload, docxPath, profile);
//       await convertToPdf(docxPath, pdfDir);

//       const pdfPath = buildPdfPath(docxPath, pdfDir);
//       const layout = await validateCandidateLayout(
//         pdfPath,
//         payload,
//         "approval",
//       );

//       const result = {
//         status: layout.passed ? "passed" : "best_effort",
//         profileName: profile.name,
//         profile,
//         pages: layout.pages,
//         docxPath,
//         pdfPath,
//         artifacts: [docxPath, pdfPath],
//       };

//       if (layout.pages.length !== 1) {
//         if (!bestResult || bestResult.pages.length !== 1) {
//           bestResult = result;
//         }
//         continue;
//       }

//       if (layout.passed) {
//         return result;
//       }

//       if (!bestResult) {
//         bestResult = result;
//       }
//     } catch (error) {
//       console.error(
//         `${LOG_PREFIX} approval candidate failed profile=${profile.name}`,
//       );
//       console.error(error);
//     }
//   }

//   if (bestResult && bestResult.pages.length === 1) {
//     return bestResult;
//   }

//   throw new Error("No valid approval profile could be generated");
// };

// const generateFinalOrderArtifact = async ({
//   payload,
//   outputPath,
//   finalProfile,
//   orderSource,
//   approvalSource,
// }) => {
//   await ensureParentDir(outputPath);

//   return order.generateOrderDocument({
//     payload,
//     outputPath,
//     profile: finalProfile,
//     orderSource,
//     approvalSource,
//   });
// };

// const evaluateFinalDocument = async ({ pdfPath, payload }) => {
//   const layoutResult = await validateLayout(pdfPath, {
//     documentType: "order_print_pdf",
//     markers: {},
//   });

//   const pages = Array.isArray(layoutResult?.pages) ? layoutResult.pages : [];
//   const hardViolations = Array.isArray(layoutResult?.hardViolations)
//     ? layoutResult.hardViolations
//     : [];

//   const hasLayoutError = hardViolations.length > 0;

//   let signatureCheck = {
//     detached: false,
//     reason: "final_signature_check_skipped_for_print_pdf",
//     debug: {},
//   };

//   try {
//     if (typeof detectDetachedSignature === "function") {
//       signatureCheck = await detectDetachedSignature(pdfPath, payload);
//     }
//   } catch (error) {
//     console.warn(`${LOG_PREFIX} detectDetachedSignature failed`);
//     console.warn(error);
//   }

//   return {
//     pages,
//     hardViolations,
//     hasLayoutError,
//     signatureCheck,
//     hasDetachedSignature: Boolean(signatureCheck?.detached),
//   };
// };

// const buildFinalResult = ({
//   finalDocxPath,
//   finalPdfPath,
//   orderResult,
//   approvalResult,
//   finalProfile,
//   finalEvaluation,
//   fallbackUsed,
//   generationArtifact,
// }) => ({
//   status:
//     !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//       ? "passed"
//       : "best_effort",
//   profile: {
//     orderProfile: orderResult.profileName,
//     approvalProfile: approvalResult.profileName,
//   },
//   layoutCheck: {
//     order: {
//       status: orderResult.status || "passed",
//       profile: orderResult.profileName,
//       variant: orderResult.selectedVariant || "base",
//       pages: orderResult.pages,
//       layoutFlags: orderResult.layoutFlags || null,
//       systemicWhitespace: orderResult.systemicWhitespace || null,
//     },
//     approval: {
//       status: approvalResult.status,
//       profile: approvalResult.profileName,
//       pages: approvalResult.pages,
//     },
//     finalOrder: {
//       status:
//         !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
//           ? "passed"
//           : "best_effort",
//       profile: orderResult.profileName,
//       pages: finalEvaluation.pages,
//       hardViolations: finalEvaluation.hardViolations,
//       detachedSignature: finalEvaluation.hasDetachedSignature,
//       detachedSignatureReason: finalEvaluation.signatureCheck?.reason || null,
//       detachedSignatureDebug: finalEvaluation.signatureCheck?.debug || {},
//     },
//   },
//   resolvedProfile: finalProfile,
//   outputPath: finalPdfPath,
//   pdfPath: finalPdfPath,
//   docxPath: finalDocxPath,
//   generationResult: {
//     docxPath: finalDocxPath,
//     pdfPath: finalPdfPath,
//     preparedPrintSettings: generationArtifact?.preparedPrintSettings || null,
//     assemblerPrintSettings: generationArtifact?.assemblerPrintSettings || null,
//     pdfMeta: generationArtifact?.pdfMeta || null,
//     pdfValidation: generationArtifact?.pdfValidation || null,
//     mergedDocxValidation: generationArtifact?.mergedDocxValidation || null,
//   },
//   fallbackUsed,
// });

// const runOrderGeneration = async (report, job) => {
//   console.log(`${LOG_PREFIX} entered job=${job._id}`);

//   const documentConfig = documents.order;

//   if (!documentConfig) {
//     throw new Error("Document config not found for type: order");
//   }

//   const payload = buildPayload(report);
//   const { orderProfiles = [], approvalProfiles = [] } =
//     documentConfig.profiles || {};
//   const generationPolicy = documentConfig.generationPolicy || {};

//   const maxFinalFallbackAttempts = Number.isInteger(
//     generationPolicy.maxFinalFallbackAttempts,
//   )
//     ? generationPolicy.maxFinalFallbackAttempts
//     : 1;

//   const finalDocxPath = buildFinalDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

//   const tempArtifacts = [];
//   const fallbackArtifacts = [];

//   console.log(
//     `${LOG_PREFIX} config loaded job=${job._id} orderProfiles=${orderProfiles.length} approvalProfiles=${approvalProfiles.length}`,
//   );
//   console.log(`${LOG_PREFIX} finalDocxPath=${finalDocxPath}`);
//   console.log(`${LOG_PREFIX} finalPdfPath=${finalPdfPath}`);
//   console.log(
//     `${LOG_PREFIX} maxFinalFallbackAttempts=${maxFinalFallbackAttempts}`,
//   );
//   console.log(
//     `${LOG_PREFIX} requested printSettings=${JSON.stringify(payload?.printSettings || null)}`,
//   );

//   try {
//     const orderSelection = await findNextGoodOrderCandidate({
//       payload,
//       job,
//       orderProfiles,
//       startIndex: 0,
//     });

//     tempArtifacts.push(...(orderSelection.artifacts || []));

//     const selectedOrder = orderSelection.selected;

//     if (!selectedOrder) {
//       throw new Error("No good order profile found");
//     }

//     console.log(
//       `${LOG_PREFIX} selected order profile=${selectedOrder.profileName} index=${selectedOrder.profileIndex} variant=${selectedOrder.selectedVariant}`,
//     );

//     const approvalResult = await runApprovalSelection({
//       payload,
//       job,
//       profiles: approvalProfiles,
//     });

//     tempArtifacts.push(...(approvalResult.artifacts || []));

//     console.log(
//       `${LOG_PREFIX} selected approval profile=${approvalResult.profileName}`,
//     );

//     let activeOrderResult = {
//       status: selectedOrder.status || "passed",
//       profileName: selectedOrder.profileName,
//       profile: selectedOrder.profile,
//       selectedVariant: selectedOrder.selectedVariant,
//       pages: selectedOrder.pages,
//       layout: selectedOrder.layout,
//       layoutFlags: selectedOrder.layoutFlags,
//       systemicWhitespace: selectedOrder.systemicWhitespace,
//       docxPath: selectedOrder.docxPath,
//       pdfPath: selectedOrder.pdfPath,
//       profileIndex: selectedOrder.profileIndex,
//     };

//     let finalProfile = {
//       orderProfile: activeOrderResult.profile,
//       approvalProfile: approvalResult.profile,
//     };

//     await cleanupFileIfExists(finalDocxPath);
//     await cleanupFileIfExists(finalPdfPath);

//     const cleanOrderSource = await prepareCleanFinalOrderSource({
//       job,
//       sourceDocxPath: activeOrderResult.docxPath,
//       artifacts: tempArtifacts,
//       suffix: "order_final_source",
//       orderFormatting: activeOrderResult?.profile?.orderFormatting || null,
//       payload,
//     });

//     let generationArtifact = await generateFinalOrderArtifact({
//       payload,
//       outputPath: finalDocxPath,
//       finalProfile,
//       orderSource: {
//         docxPath: cleanOrderSource.docxPath,
//         pdfPath: cleanOrderSource.pdfPath,
//       },
//       approvalSource: {
//         docxPath: approvalResult.docxPath,
//         pdfPath: approvalResult.pdfPath,
//       },
//     });

//     let finalEvaluation = await evaluateFinalDocument({
//       pdfPath: finalPdfPath,
//       payload,
//     });

//     let fallbackUsed = false;
//     let nextSearchIndex = activeOrderResult.profileIndex + 1;
//     let attempts = 0;

//     while (
//       finalEvaluation.hasDetachedSignature &&
//       attempts < maxFinalFallbackAttempts
//     ) {
//       attempts += 1;

//       console.warn(
//         `${LOG_PREFIX} final detached signature detected for profile=${activeOrderResult.profileName}; fallback attempt=${attempts}`,
//       );

//       const nextOrderSelection = await findNextGoodOrderCandidate({
//         payload,
//         job,
//         orderProfiles,
//         startIndex: nextSearchIndex,
//       });

//       tempArtifacts.push(...(nextOrderSelection.artifacts || []));

//       const nextOrder = nextOrderSelection.selected;

//       if (!nextOrder) {
//         console.warn(
//           `${LOG_PREFIX} no additional good order profile found for final fallback`,
//         );
//         break;
//       }

//       nextSearchIndex = nextOrder.profileIndex + 1;

//       activeOrderResult = {
//         status: nextOrder.status || "passed",
//         profileName: nextOrder.profileName,
//         profile: nextOrder.profile,
//         selectedVariant: nextOrder.selectedVariant,
//         pages: nextOrder.pages,
//         layout: nextOrder.layout,
//         layoutFlags: nextOrder.layoutFlags,
//         systemicWhitespace: nextOrder.systemicWhitespace,
//         docxPath: nextOrder.docxPath,
//         pdfPath: nextOrder.pdfPath,
//         profileIndex: nextOrder.profileIndex,
//       };

//       finalProfile = {
//         orderProfile: activeOrderResult.profile,
//         approvalProfile: approvalResult.profile,
//       };

//       const fallbackFinalDocxPath = buildFinalCandidateDocxPath(
//         job,
//         `fallback_${attempts}`,
//       );
//       const fallbackFinalPdfPath = buildPdfPath(fallbackFinalDocxPath, pdfDir);

//       fallbackArtifacts.push(fallbackFinalDocxPath, fallbackFinalPdfPath);

//       await cleanupFileIfExists(fallbackFinalDocxPath);
//       await cleanupFileIfExists(fallbackFinalPdfPath);

//       const fallbackCleanOrderSource = await prepareCleanFinalOrderSource({
//         job,
//         sourceDocxPath: activeOrderResult.docxPath,
//         artifacts: tempArtifacts,
//         suffix: `order_final_source_fallback_${attempts}`,
//         orderFormatting: activeOrderResult?.profile?.orderFormatting || null,
//         payload,
//       });

//       const fallbackArtifact = await generateFinalOrderArtifact({
//         payload,
//         outputPath: fallbackFinalDocxPath,
//         finalProfile,
//         orderSource: {
//           docxPath: fallbackCleanOrderSource.docxPath,
//           pdfPath: fallbackCleanOrderSource.pdfPath,
//         },
//         approvalSource: {
//           docxPath: approvalResult.docxPath,
//           pdfPath: approvalResult.pdfPath,
//         },
//       });

//       const fallbackPdfPath = fallbackArtifact?.pdfPath || fallbackFinalPdfPath;

//       const fallbackEvaluation = await evaluateFinalDocument({
//         pdfPath: fallbackPdfPath,
//         payload,
//       });

//       if (!fallbackEvaluation.hasDetachedSignature) {
//         await cleanupFileIfExists(finalDocxPath);
//         await cleanupFileIfExists(finalPdfPath);
//         await fs.copyFile(fallbackFinalDocxPath, finalDocxPath);
//         await fs.copyFile(fallbackPdfPath, finalPdfPath);

//         finalEvaluation = fallbackEvaluation;
//         generationArtifact = {
//           ...fallbackArtifact,
//           docxPath: finalDocxPath,
//           pdfPath: finalPdfPath,
//           pdfMeta: fallbackArtifact?.pdfMeta
//             ? {
//                 ...fallbackArtifact.pdfMeta,
//                 outputPdfPath: finalPdfPath,
//               }
//             : null,
//           pdfValidation: fallbackArtifact?.pdfValidation
//             ? {
//                 ...fallbackArtifact.pdfValidation,
//                 pdfPath: finalPdfPath,
//               }
//             : null,
//         };
//         fallbackUsed = true;
//         break;
//       }
//     }

//     console.log(`${LOG_PREFIX} completed job=${job._id}`);
//     console.log(
//       `${LOG_PREFIX} final output docx=${finalDocxPath} pdf=${finalPdfPath}`,
//     );

//     return buildFinalResult({
//       finalDocxPath,
//       finalPdfPath,
//       orderResult: activeOrderResult,
//       approvalResult,
//       finalProfile,
//       finalEvaluation,
//       fallbackUsed,
//       generationArtifact,
//     });
//   } catch (error) {
//     console.error(`${LOG_PREFIX} failed job=${job._id}`);
//     console.error(error);
//     throw error;
//   } finally {
//     console.log(`${LOG_PREFIX} finally start job=${job._id}`);

//     if (DEBUG_KEEP_ARTIFACTS) {
//       console.log(
//         `${LOG_PREFIX} cleanup skipped because DEBUG_KEEP_ARTIFACTS=true`,
//       );
//     } else {
//       await sleep(1000);

//       const artifactsToCleanup = [
//         ...new Set([...tempArtifacts, ...fallbackArtifacts]),
//       ];

//       if (artifactsToCleanup.length) {
//         await cleanupArtifacts(artifactsToCleanup);
//       }

//       await cleanupJobArtifactsByPrefix(job._id, {
//         keepDocxNames: [`${job._id}_nakaz.docx`],
//         keepPdfNames: [`${job._id}_nakaz.pdf`],
//       });

//       await sleep(1500);

//       await cleanupJobArtifactsByPrefix(job._id, {
//         keepDocxNames: [`${job._id}_nakaz.docx`],
//         keepPdfNames: [`${job._id}_nakaz.pdf`],
//       });

//       console.log(`${LOG_PREFIX} cleanup completed job=${job._id}`);
//     }

//     console.log(`${LOG_PREFIX} finally end job=${job._id}`);
//   }
// };

// module.exports = runOrderGeneration;
const fs = require("fs/promises");
const path = require("path");

const { convertToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const validateLayout = require("./validateLayout");
const detectDetachedSignature = require("../generation/detectDetachedSignature");
const documents = require("../documents");
const order = require("../documents/order");
const { tryBottomMarginFallback } = require("./tryBottomMarginFallback");

const LOG_PREFIX = "[runOrderGeneration]";
const DEBUG_KEEP_ARTIFACTS = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const buildFinalCandidateDocxPath = (job, suffix) =>
  path.join(
    process.cwd(),
    "storage",
    "docx",
    `${job._id}_nakaz_${suffix}.docx`,
  );

const ensureParentDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const cleanupFileIfExists = async (filePath, options = {}) => {
  const retries = Number.isInteger(options.retries) ? options.retries : 6;
  const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 500;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await fs.unlink(filePath);
      console.log(`${LOG_PREFIX} cleaned file=${filePath}`);
      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        return true;
      }

      const isLastAttempt = attempt === retries;
      const isRetryable =
        error.code === "EBUSY" ||
        error.code === "EPERM" ||
        error.code === "EACCES";

      if (!isRetryable || isLastAttempt) {
        console.warn(
          `${LOG_PREFIX} cleanup failed file=${filePath} code=${error.code}`,
        );
        console.warn(error.message);
        return false;
      }

      console.warn(
        `${LOG_PREFIX} cleanup retry file=${filePath} code=${error.code} attempt=${attempt + 1}/${retries + 1}`,
      );

      await sleep(delayMs);
    }
  }

  return false;
};

const replaceFile = async (sourcePath, targetPath) => {
  if (!sourcePath || !targetPath) {
    throw new Error("replaceFile: sourcePath and targetPath are required");
  }

  if (sourcePath === targetPath) {
    return targetPath;
  }

  await cleanupFileIfExists(targetPath);
  await fs.rename(sourcePath, targetPath);

  return targetPath;
};

const cleanupArtifacts = async (paths) => {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  console.log(
    `${LOG_PREFIX} cleanupArtifacts start count=${uniquePaths.length}`,
  );

  for (const filePath of uniquePaths) {
    await cleanupFileIfExists(filePath);
  }

  console.log(`${LOG_PREFIX} cleanupArtifacts end`);
};

const listJobArtifactsByPrefix = async (
  jobId,
  { keepDocxNames = [], keepPdfNames = [] } = {},
) => {
  const docxDir = path.join(process.cwd(), "storage", "docx");
  const pdfDir = path.join(process.cwd(), "storage", "pdf");

  const keepDocxSet = new Set(keepDocxNames.filter(Boolean));
  const keepPdfSet = new Set(keepPdfNames.filter(Boolean));

  const collectDir = async (dirPath, keepSet) => {
    let entries = [];

    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }

    return entries
      .filter((entry) => entry.isFile())
      .filter((entry) => entry.name.startsWith(`${jobId}_`))
      .filter((entry) => !keepSet.has(entry.name))
      .map((entry) => path.join(dirPath, entry.name));
  };

  const docxFiles = await collectDir(docxDir, keepDocxSet);
  const pdfFiles = await collectDir(pdfDir, keepPdfSet);

  return [...docxFiles, ...pdfFiles];
};

const cleanupJobArtifactsByPrefix = async (
  jobId,
  { keepDocxNames = [], keepPdfNames = [] } = {},
) => {
  const paths = await listJobArtifactsByPrefix(jobId, {
    keepDocxNames,
    keepPdfNames,
  });

  console.log(
    `${LOG_PREFIX} cleanupJobArtifactsByPrefix start job=${jobId} count=${paths.length}`,
  );

  for (const fullPath of paths) {
    console.log(
      `${LOG_PREFIX} cleanupJobArtifactsByPrefix candidate=${fullPath}`,
    );
    await cleanupFileIfExists(fullPath);
  }

  console.log(`${LOG_PREFIX} cleanupJobArtifactsByPrefix end job=${jobId}`);
};

const cleanupJobArtifactsByPrefixMultiPass = async (
  jobId,
  { keepDocxNames = [], keepPdfNames = [], passes = 5, delayMs = 1500 } = {},
) => {
  for (let pass = 1; pass <= passes; pass++) {
    const remainingBefore = await listJobArtifactsByPrefix(jobId, {
      keepDocxNames,
      keepPdfNames,
    });

    console.log(
      `${LOG_PREFIX} cleanupJobArtifactsByPrefixMultiPass pass=${pass}/${passes} remainingBefore=${remainingBefore.length}`,
    );

    if (!remainingBefore.length) {
      console.log(
        `${LOG_PREFIX} cleanupJobArtifactsByPrefixMultiPass finished early job=${jobId} pass=${pass}`,
      );
      return;
    }

    await cleanupJobArtifactsByPrefix(jobId, {
      keepDocxNames,
      keepPdfNames,
    });

    const remainingAfter = await listJobArtifactsByPrefix(jobId, {
      keepDocxNames,
      keepPdfNames,
    });

    console.log(
      `${LOG_PREFIX} cleanupJobArtifactsByPrefixMultiPass pass=${pass}/${passes} remainingAfter=${remainingAfter.length}`,
    );

    if (!remainingAfter.length) {
      console.log(
        `${LOG_PREFIX} cleanupJobArtifactsByPrefixMultiPass completed job=${jobId} pass=${pass}`,
      );
      return;
    }

    if (pass < passes) {
      await sleep(delayMs);
    }
  }

  const leftovers = await listJobArtifactsByPrefix(jobId, {
    keepDocxNames,
    keepPdfNames,
  });

  if (leftovers.length) {
    console.warn(
      `${LOG_PREFIX} cleanupJobArtifactsByPrefixMultiPass leftovers job=${jobId} count=${leftovers.length}`,
    );
    for (const filePath of leftovers) {
      console.warn(`${LOG_PREFIX} leftover file=${filePath}`);
    }
  }
};

const formatSignerDate = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const buildValidationContext = (payload, label) => {
  if (label === "order") {
    const signer = payload.data?.signer || {};

    return {
      documentType: "order",
      expectedBottomMarginCm: 2.0,
      minAllowedBottomMarginCm: 1.9,
      maxAllowedBottomMarginCm: 3.2,
      systemicWhitespaceThresholdCm: 2.2,
      systemicWhitespaceMinShare: 0.5,
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
      expectedBottomMarginCm: 2.0,
      minAllowedBottomMarginCm: 1.9,
      maxAllowedBottomMarginCm: 3.2,
      systemicWhitespaceThresholdCm: 2.2,
      systemicWhitespaceMinShare: 0.5,
      markers: {},
    };
  }

  if (payload.documentType === "report") {
    const signer = payload.data?.signer || {};

    return {
      documentType: "report",
      expectedBottomMarginCm: 2.0,
      minAllowedBottomMarginCm: 1.9,
      maxAllowedBottomMarginCm: 3.2,
      systemicWhitespaceThresholdCm: 2.2,
      systemicWhitespaceMinShare: 0.5,
      markers: {
        proshu: "ПРОШУ:",
        foundationPhrase: "На підставі вищезазначеного,",
        signerPosition: signer.position,
        signerMilitaryUnit: signer.militaryUnit,
        signerRank: signer.rank,
        signerFullName: signer.fullName,
        signerDate: signer.date,
        signerDateFormatted: formatSignerDate(signer.date),
      },
    };
  }

  return {
    documentType: label || payload.documentType,
    expectedBottomMarginCm: 2.0,
    minAllowedBottomMarginCm: 1.9,
    maxAllowedBottomMarginCm: 3.2,
    systemicWhitespaceThresholdCm: 2.2,
    systemicWhitespaceMinShare: 0.5,
    markers: {},
  };
};

const validateCandidateLayout = async (pdfPath, payload, label) => {
  const validationContext = buildValidationContext(payload, label);
  return validateLayout(pdfPath, validationContext);
};

const applyOrderPaginationFixesToFile = async (docxPath, profile, payload) => {
  console.log(
    `${LOG_PREFIX} applyOrderPaginationFixesToFile start docxPath=${docxPath}`,
  );

  const generatedDocxBuffer = await fs.readFile(docxPath);

  const fixedDocxBuffer = applyDocumentPaginationFixes(generatedDocxBuffer, {
    documentType: "order",
    orderFormatting: profile?.orderFormatting,
    orderTitleText: payload?.data?.orderDetails?.orderTitle || "",
  });

  await fs.writeFile(docxPath, fixedDocxBuffer);

  console.log(
    `${LOG_PREFIX} applyOrderPaginationFixesToFile done docxPath=${docxPath}`,
  );
};

const evaluateOrderCandidate = async ({
  payload,
  job,
  pdfDir,
  profile,
  profileIndex,
}) => {
  const docxPath = buildDocxPath(job, `order_candidate_${profileIndex + 1}`);
  const pdfPath = buildPdfPath(docxPath, pdfDir);
  const artifacts = [docxPath, pdfPath];
  const candidateStartedAt = Date.now();

  try {
    console.log(
      `${LOG_PREFIX} order-candidate-start profile=${profile.name} index=${profileIndex}`,
    );

    await ensureParentDir(docxPath);
    await cleanupFileIfExists(docxPath);
    await cleanupFileIfExists(pdfPath);

    const docxStartedAt = Date.now();
    await order.generateOrderOnlyDocument(payload, docxPath, profile);

    await applyOrderPaginationFixesToFile(docxPath, profile, payload);

    const pdfStartedAt = Date.now();
    await convertToPdf(docxPath, pdfDir);

    const validateStartedAt = Date.now();
    const layout = await validateCandidateLayout(pdfPath, payload, "order");

    console.log(
      `${LOG_PREFIX} order-candidate-timings profile=${profile.name} docxMs=${pdfStartedAt - docxStartedAt} pdfMs=${validateStartedAt - pdfStartedAt} validateMs=${Date.now() - validateStartedAt} totalMs=${Date.now() - candidateStartedAt}`,
    );

    console.log(
      `${LOG_PREFIX} order-candidate-summary profile=${profile.name} passed=${layout.passed} hard=${layout.hardViolations.length} margin=${layout.marginViolations.length} systemicWhitespace=${layout.systemicWhitespace?.triggered} whitespaceScore=${layout.systemicWhitespace?.score}`,
    );

    console.log(
      `${LOG_PREFIX} order-candidate-hard-codes profile=${profile.name} codes=${JSON.stringify(layout.hardViolations.map((v) => v.code))}`,
    );

    return {
      ok: true,
      profileName: profile.name,
      profile,
      profileIndex,
      pages: layout.pages,
      hardViolations: layout.hardViolations,
      marginViolations: layout.marginViolations,
      hasLayoutError: !layout.passed,
      docxPath,
      pdfPath,
      layout,
      layoutFlags: layout.layoutFlags,
      systemicWhitespace: layout.systemicWhitespace,
      artifacts,
    };
  } catch (error) {
    console.error(
      `${LOG_PREFIX} order-candidate-failed profile=${profile.name} index=${profileIndex}`,
    );
    console.error(error);

    return {
      ok: false,
      profileName: profile.name,
      profile,
      profileIndex,
      pages: [],
      hardViolations: [],
      marginViolations: [],
      hasLayoutError: true,
      error: error.message,
      docxPath,
      pdfPath,
      layout: null,
      layoutFlags: null,
      systemicWhitespace: null,
      artifacts,
    };
  }
};

const prepareCleanFinalOrderSource = async ({
  job,
  sourceDocxPath,
  artifacts,
  suffix = "order_final_source",
  orderFormatting = null,
  payload,
}) => {
  const pdfDir = buildPdfDir();
  const cleanDocxPath = buildDocxPath(job, suffix);
  const cleanPdfPath = buildPdfPath(cleanDocxPath, pdfDir);

  console.log(
    `${LOG_PREFIX} prepareCleanFinalOrderSource start sourceDocxPath=${sourceDocxPath} suffix=${suffix}`,
  );

  await cleanupFileIfExists(cleanDocxPath);
  await cleanupFileIfExists(cleanPdfPath);

  const sourceBuffer = await fs.readFile(sourceDocxPath);
  const cleanedBuffer = applyDocumentPaginationFixes(sourceBuffer, {
    documentType: "order",
    orderFormatting,
    orderTitleText: payload?.data?.orderDetails?.orderTitle || "",
  });

  await ensureParentDir(cleanDocxPath);
  await fs.writeFile(cleanDocxPath, cleanedBuffer);

  await convertToPdf(cleanDocxPath, pdfDir);

  if (Array.isArray(artifacts)) {
    artifacts.push(cleanDocxPath, cleanPdfPath);
  }

  return {
    docxPath: cleanDocxPath,
    pdfPath: cleanPdfPath,
  };
};

const findNextGoodOrderCandidate = async ({
  payload,
  job,
  orderProfiles,
  startIndex = 0,
}) => {
  console.log(
    `${LOG_PREFIX} findNextGoodOrderCandidate start startIndex=${startIndex} totalProfiles=${orderProfiles.length}`,
  );

  const pdfDir = buildPdfDir();
  const artifacts = [];

  try {
    for (let index = startIndex; index < orderProfiles.length; index++) {
      const profile = orderProfiles[index];

      console.log(
        `${LOG_PREFIX} trying order profile index=${index} profile=${profile.name}`,
      );

      const result = await evaluateOrderCandidate({
        payload,
        job,
        pdfDir,
        profile,
        profileIndex: index,
      });

      artifacts.push(...(result.artifacts || []));

      if (!result.ok) {
        console.warn(
          `${LOG_PREFIX} continue-after-order-profile profile=${profile.name} reason=candidate_failed`,
        );
        continue;
      }

      const markerOk = Boolean(result.layoutFlags?.nakazuiuOk);
      const signatureOk = Boolean(result.layoutFlags?.signatureOk);
      const systemicWhitespace = Boolean(result.systemicWhitespace?.triggered);

      console.log(
        `${LOG_PREFIX} order-candidate-flags profile=${result.profileName} markerOk=${markerOk} signatureOk=${signatureOk} systemicWhitespace=${systemicWhitespace} whitespaceScore=${result.systemicWhitespace?.score ?? "n/a"}`,
      );

      if (!markerOk || !signatureOk) {
        console.warn(
          `${LOG_PREFIX} continue-after-order-profile profile=${result.profileName} reason=critical_layout_block_failed markerOk=${markerOk} signatureOk=${signatureOk}`,
        );
        continue;
      }

      if (!systemicWhitespace) {
        console.log(
          `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=base reason=base_ok_no_systemic_tail`,
        );

        return {
          selected: {
            status: result.hasLayoutError ? "best_effort" : "passed",
            profileName: result.profileName,
            profile: result.profile,
            profileIndex: result.profileIndex,
            selectedVariant: "base",
            pages: result.pages,
            hardViolations: result.hardViolations,
            marginViolations: result.marginViolations,
            docxPath: result.docxPath,
            pdfPath: result.pdfPath,
            layout: result.layout,
            layoutFlags: result.layoutFlags,
            systemicWhitespace: result.systemicWhitespace,
          },
          artifacts,
        };
      }

      const fallbackDecision = await tryBottomMarginFallback({
        payload,
        profileName: result.profileName,
        baseDocxPath: result.docxPath,
        pdfDir,
        cleanupFileIfExists,
        logger: console,
      });

      artifacts.push(...(fallbackDecision.artifacts || []));

      console.warn(
        `${LOG_PREFIX} order-bottom-margin-fallback profile=${result.profileName} decision=${fallbackDecision.decision} reason=${fallbackDecision.reason}`,
      );

      if (fallbackDecision.decision === "accept-base") {
        console.log(
          `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=base reason=fallback_accept_base`,
        );

        return {
          selected: {
            status: fallbackDecision.base.layout.passed
              ? "passed"
              : "best_effort",
            profileName: result.profileName,
            profile: result.profile,
            profileIndex: result.profileIndex,
            selectedVariant: "base",
            pages: fallbackDecision.base.layout.pages,
            hardViolations: fallbackDecision.base.layout.hardViolations,
            marginViolations: fallbackDecision.base.layout.marginViolations,
            docxPath: result.docxPath,
            pdfPath: result.pdfPath,
            layout: fallbackDecision.base.layout,
            layoutFlags: fallbackDecision.base.layout.layoutFlags,
            systemicWhitespace: fallbackDecision.base.layout.systemicWhitespace,
          },
          artifacts,
        };
      }

      if (fallbackDecision.decision === "accept-alt") {
        const finalDocxPath = result.docxPath;
        const finalPdfPath = result.pdfPath;

        await replaceFile(fallbackDecision.alt.docxPath, finalDocxPath);
        await replaceFile(fallbackDecision.alt.pdfPath, finalPdfPath);

        console.log(
          `${LOG_PREFIX} stop-on-order-profile profile=${result.profileName} variant=${path.parse(fallbackDecision.alt.docxPath).name.replace(path.parse(result.docxPath).name + ".", "")} reason=accept_alt_margin_fallback`,
        );

        return {
          selected: {
            status: fallbackDecision.alt.layout.passed
              ? "passed"
              : "best_effort",
            profileName: result.profileName,
            profile: result.profile,
            profileIndex: result.profileIndex,
            selectedVariant: "margin-fallback",
            pages: fallbackDecision.alt.layout.pages,
            hardViolations: fallbackDecision.alt.layout.hardViolations,
            marginViolations: fallbackDecision.alt.layout.marginViolations,
            docxPath: finalDocxPath,
            pdfPath: finalPdfPath,
            layout: fallbackDecision.alt.layout,
            layoutFlags: fallbackDecision.alt.layout.layoutFlags,
            systemicWhitespace: fallbackDecision.alt.layout.systemicWhitespace,
          },
          artifacts,
        };
      }

      console.warn(
        `${LOG_PREFIX} continue-after-order-profile profile=${result.profileName} reason=fallback_not_accepted`,
      );
    }

    console.warn(
      `${LOG_PREFIX} no good order profile found starting from index=${startIndex}`,
    );

    return {
      selected: null,
      artifacts,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} findNextGoodOrderCandidate failed`);
    console.error(error);

    return {
      selected: null,
      artifacts,
    };
  }
};

const runApprovalSelection = async ({ payload, job, profiles }) => {
  if (!profiles.length) {
    throw new Error("No approval profiles configured");
  }

  const docxPath = buildDocxPath(job, "approval");
  const pdfDir = buildPdfDir();

  let bestResult = null;

  console.log(
    `${LOG_PREFIX} runApprovalSelection start totalProfiles=${profiles.length}`,
  );

  for (const profile of profiles) {
    try {
      console.log(
        `${LOG_PREFIX} approval evaluate start profile=${profile.name}`,
      );

      await ensureParentDir(docxPath);
      await cleanupFileIfExists(docxPath);
      await cleanupFileIfExists(buildPdfPath(docxPath, pdfDir));

      await order.generateApprovalOnlyDocument(payload, docxPath, profile);
      await convertToPdf(docxPath, pdfDir);

      const pdfPath = buildPdfPath(docxPath, pdfDir);
      const layout = await validateCandidateLayout(
        pdfPath,
        payload,
        "approval",
      );

      const result = {
        status: layout.passed ? "passed" : "best_effort",
        profileName: profile.name,
        profile,
        pages: layout.pages,
        docxPath,
        pdfPath,
        artifacts: [docxPath, pdfPath],
      };

      if (layout.pages.length !== 1) {
        if (!bestResult || bestResult.pages.length !== 1) {
          bestResult = result;
        }
        continue;
      }

      if (layout.passed) {
        return result;
      }

      if (!bestResult) {
        bestResult = result;
      }
    } catch (error) {
      console.error(
        `${LOG_PREFIX} approval candidate failed profile=${profile.name}`,
      );
      console.error(error);
    }
  }

  if (bestResult && bestResult.pages.length === 1) {
    return bestResult;
  }

  throw new Error("No valid approval profile could be generated");
};

const generateFinalOrderArtifact = async ({
  payload,
  outputPath,
  finalProfile,
  orderSource,
  approvalSource,
}) => {
  await ensureParentDir(outputPath);

  return order.generateOrderDocument({
    payload,
    outputPath,
    profile: finalProfile,
    orderSource,
    approvalSource,
  });
};

const evaluateFinalDocument = async ({ pdfPath, payload }) => {
  const layoutResult = await validateLayout(pdfPath, {
    documentType: "order_print_pdf",
    markers: {},
  });

  const pages = Array.isArray(layoutResult?.pages) ? layoutResult.pages : [];
  const hardViolations = Array.isArray(layoutResult?.hardViolations)
    ? layoutResult.hardViolations
    : [];

  const hasLayoutError = hardViolations.length > 0;

  let signatureCheck = {
    detached: false,
    reason: "final_signature_check_skipped_for_print_pdf",
    debug: {},
  };

  try {
    if (typeof detectDetachedSignature === "function") {
      signatureCheck = await detectDetachedSignature(pdfPath, payload);
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} detectDetachedSignature failed`);
    console.warn(error);
  }

  return {
    pages,
    hardViolations,
    hasLayoutError,
    signatureCheck,
    hasDetachedSignature: Boolean(signatureCheck?.detached),
  };
};

const buildFinalResult = ({
  finalDocxPath,
  finalPdfPath,
  orderResult,
  approvalResult,
  finalProfile,
  finalEvaluation,
  fallbackUsed,
  generationArtifact,
}) => ({
  status:
    !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
      ? "passed"
      : "best_effort",
  profile: {
    orderProfile: orderResult.profileName,
    approvalProfile: approvalResult.profileName,
  },
  layoutCheck: {
    order: {
      status: orderResult.status || "passed",
      profile: orderResult.profileName,
      variant: orderResult.selectedVariant || "base",
      pages: orderResult.pages,
      layoutFlags: orderResult.layoutFlags || null,
      systemicWhitespace: orderResult.systemicWhitespace || null,
    },
    approval: {
      status: approvalResult.status,
      profile: approvalResult.profileName,
      pages: approvalResult.pages,
    },
    finalOrder: {
      status:
        !finalEvaluation.hasLayoutError && !finalEvaluation.hasDetachedSignature
          ? "passed"
          : "best_effort",
      profile: orderResult.profileName,
      pages: finalEvaluation.pages,
      hardViolations: finalEvaluation.hardViolations,
      detachedSignature: finalEvaluation.hasDetachedSignature,
      detachedSignatureReason: finalEvaluation.signatureCheck?.reason || null,
      detachedSignatureDebug: finalEvaluation.signatureCheck?.debug || {},
    },
  },
  resolvedProfile: finalProfile,
  outputPath: finalPdfPath,
  pdfPath: finalPdfPath,
  docxPath: finalDocxPath,
  generationResult: {
    docxPath: finalDocxPath,
    pdfPath: finalPdfPath,
    preparedPrintSettings: generationArtifact?.preparedPrintSettings || null,
    assemblerPrintSettings: generationArtifact?.assemblerPrintSettings || null,
    pdfMeta: generationArtifact?.pdfMeta || null,
    pdfValidation: generationArtifact?.pdfValidation || null,
    mergedDocxValidation: generationArtifact?.mergedDocxValidation || null,
  },
  fallbackUsed,
});

const runOrderGeneration = async (report, job) => {
  console.log(`${LOG_PREFIX} entered job=${job._id}`);

  const documentConfig = documents.order;

  if (!documentConfig) {
    throw new Error("Document config not found for type: order");
  }

  const payload = buildPayload(report);
  const { orderProfiles = [], approvalProfiles = [] } =
    documentConfig.profiles || {};
  const generationPolicy = documentConfig.generationPolicy || {};

  const maxFinalFallbackAttempts = Number.isInteger(
    generationPolicy.maxFinalFallbackAttempts,
  )
    ? generationPolicy.maxFinalFallbackAttempts
    : 1;

  const finalDocxPath = buildFinalDocxPath(job);
  const pdfDir = buildPdfDir();
  const finalPdfPath = buildPdfPath(finalDocxPath, pdfDir);

  const tempArtifacts = [];
  const fallbackArtifacts = [];

  console.log(
    `${LOG_PREFIX} config loaded job=${job._id} orderProfiles=${orderProfiles.length} approvalProfiles=${approvalProfiles.length}`,
  );
  console.log(`${LOG_PREFIX} finalDocxPath=${finalDocxPath}`);
  console.log(`${LOG_PREFIX} finalPdfPath=${finalPdfPath}`);
  console.log(
    `${LOG_PREFIX} maxFinalFallbackAttempts=${maxFinalFallbackAttempts}`,
  );
  console.log(
    `${LOG_PREFIX} requested printSettings=${JSON.stringify(payload?.printSettings || null)}`,
  );

  try {
    const orderSelection = await findNextGoodOrderCandidate({
      payload,
      job,
      orderProfiles,
      startIndex: 0,
    });

    tempArtifacts.push(...(orderSelection.artifacts || []));

    const selectedOrder = orderSelection.selected;

    if (!selectedOrder) {
      throw new Error("No good order profile found");
    }

    console.log(
      `${LOG_PREFIX} selected order profile=${selectedOrder.profileName} index=${selectedOrder.profileIndex} variant=${selectedOrder.selectedVariant}`,
    );

    const approvalResult = await runApprovalSelection({
      payload,
      job,
      profiles: approvalProfiles,
    });

    tempArtifacts.push(...(approvalResult.artifacts || []));

    console.log(
      `${LOG_PREFIX} selected approval profile=${approvalResult.profileName}`,
    );

    let activeOrderResult = {
      status: selectedOrder.status || "passed",
      profileName: selectedOrder.profileName,
      profile: selectedOrder.profile,
      selectedVariant: selectedOrder.selectedVariant,
      pages: selectedOrder.pages,
      layout: selectedOrder.layout,
      layoutFlags: selectedOrder.layoutFlags,
      systemicWhitespace: selectedOrder.systemicWhitespace,
      docxPath: selectedOrder.docxPath,
      pdfPath: selectedOrder.pdfPath,
      profileIndex: selectedOrder.profileIndex,
    };

    let finalProfile = {
      orderProfile: activeOrderResult.profile,
      approvalProfile: approvalResult.profile,
    };

    await cleanupFileIfExists(finalDocxPath);
    await cleanupFileIfExists(finalPdfPath);

    const cleanOrderSource = await prepareCleanFinalOrderSource({
      job,
      sourceDocxPath: activeOrderResult.docxPath,
      artifacts: tempArtifacts,
      suffix: "order_final_source",
      orderFormatting: activeOrderResult?.profile?.orderFormatting || null,
      payload,
    });

    let generationArtifact = await generateFinalOrderArtifact({
      payload,
      outputPath: finalDocxPath,
      finalProfile,
      orderSource: {
        docxPath: cleanOrderSource.docxPath,
        pdfPath: cleanOrderSource.pdfPath,
      },
      approvalSource: {
        docxPath: approvalResult.docxPath,
        pdfPath: approvalResult.pdfPath,
      },
    });

    let finalEvaluation = await evaluateFinalDocument({
      pdfPath: finalPdfPath,
      payload,
    });

    let fallbackUsed = false;
    let nextSearchIndex = activeOrderResult.profileIndex + 1;
    let attempts = 0;

    while (
      finalEvaluation.hasDetachedSignature &&
      attempts < maxFinalFallbackAttempts
    ) {
      attempts += 1;

      console.warn(
        `${LOG_PREFIX} final detached signature detected for profile=${activeOrderResult.profileName}; fallback attempt=${attempts}`,
      );

      const nextOrderSelection = await findNextGoodOrderCandidate({
        payload,
        job,
        orderProfiles,
        startIndex: nextSearchIndex,
      });

      tempArtifacts.push(...(nextOrderSelection.artifacts || []));

      const nextOrder = nextOrderSelection.selected;

      if (!nextOrder) {
        console.warn(
          `${LOG_PREFIX} no additional good order profile found for final fallback`,
        );
        break;
      }

      nextSearchIndex = nextOrder.profileIndex + 1;

      activeOrderResult = {
        status: nextOrder.status || "passed",
        profileName: nextOrder.profileName,
        profile: nextOrder.profile,
        selectedVariant: nextOrder.selectedVariant,
        pages: nextOrder.pages,
        layout: nextOrder.layout,
        layoutFlags: nextOrder.layoutFlags,
        systemicWhitespace: nextOrder.systemicWhitespace,
        docxPath: nextOrder.docxPath,
        pdfPath: nextOrder.pdfPath,
        profileIndex: nextOrder.profileIndex,
      };

      finalProfile = {
        orderProfile: activeOrderResult.profile,
        approvalProfile: approvalResult.profile,
      };

      const fallbackFinalDocxPath = buildFinalCandidateDocxPath(
        job,
        `fallback_${attempts}`,
      );
      const fallbackFinalPdfPath = buildPdfPath(fallbackFinalDocxPath, pdfDir);

      fallbackArtifacts.push(fallbackFinalDocxPath, fallbackFinalPdfPath);

      await cleanupFileIfExists(fallbackFinalDocxPath);
      await cleanupFileIfExists(fallbackFinalPdfPath);

      const fallbackCleanOrderSource = await prepareCleanFinalOrderSource({
        job,
        sourceDocxPath: activeOrderResult.docxPath,
        artifacts: tempArtifacts,
        suffix: `order_final_source_fallback_${attempts}`,
        orderFormatting: activeOrderResult?.profile?.orderFormatting || null,
        payload,
      });

      const fallbackArtifact = await generateFinalOrderArtifact({
        payload,
        outputPath: fallbackFinalDocxPath,
        finalProfile,
        orderSource: {
          docxPath: fallbackCleanOrderSource.docxPath,
          pdfPath: fallbackCleanOrderSource.pdfPath,
        },
        approvalSource: {
          docxPath: approvalResult.docxPath,
          pdfPath: approvalResult.pdfPath,
        },
      });

      const fallbackPdfPath = fallbackArtifact?.pdfPath || fallbackFinalPdfPath;

      const fallbackEvaluation = await evaluateFinalDocument({
        pdfPath: fallbackPdfPath,
        payload,
      });

      if (!fallbackEvaluation.hasDetachedSignature) {
        await cleanupFileIfExists(finalDocxPath);
        await cleanupFileIfExists(finalPdfPath);
        await fs.copyFile(fallbackFinalDocxPath, finalDocxPath);
        await fs.copyFile(fallbackPdfPath, finalPdfPath);

        finalEvaluation = fallbackEvaluation;
        generationArtifact = {
          ...fallbackArtifact,
          docxPath: finalDocxPath,
          pdfPath: finalPdfPath,
          pdfMeta: fallbackArtifact?.pdfMeta
            ? {
                ...fallbackArtifact.pdfMeta,
                outputPdfPath: finalPdfPath,
              }
            : null,
          pdfValidation: fallbackArtifact?.pdfValidation
            ? {
                ...fallbackArtifact.pdfValidation,
                pdfPath: finalPdfPath,
              }
            : null,
        };
        fallbackUsed = true;
        break;
      }
    }

    console.log(`${LOG_PREFIX} completed job=${job._id}`);
    console.log(
      `${LOG_PREFIX} final output docx=${finalDocxPath} pdf=${finalPdfPath}`,
    );

    return buildFinalResult({
      finalDocxPath,
      finalPdfPath,
      orderResult: activeOrderResult,
      approvalResult,
      finalProfile,
      finalEvaluation,
      fallbackUsed,
      generationArtifact,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} failed job=${job._id}`);
    console.error(error);
    throw error;
  } finally {
    console.log(`${LOG_PREFIX} finally start job=${job._id}`);

    if (DEBUG_KEEP_ARTIFACTS) {
      console.log(
        `${LOG_PREFIX} cleanup skipped because DEBUG_KEEP_ARTIFACTS=true`,
      );
    } else {
      await sleep(1000);

      const artifactsToCleanup = [
        ...new Set([...tempArtifacts, ...fallbackArtifacts]),
      ];

      if (artifactsToCleanup.length) {
        await cleanupArtifacts(artifactsToCleanup);
      }

      await cleanupJobArtifactsByPrefixMultiPass(job._id, {
        keepDocxNames: [`${job._id}_nakaz.docx`],
        keepPdfNames: [`${job._id}_nakaz.pdf`],
        passes: 5,
        delayMs: 1500,
      });

      console.log(`${LOG_PREFIX} cleanup completed job=${job._id}`);
    }

    console.log(`${LOG_PREFIX} finally end job=${job._id}`);
  }
};

module.exports = runOrderGeneration;
