// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");

// const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const getActProfilesByTemplateType = (documentConfig, templateType) => {
//   const profilesByType = documentConfig.profiles || {};

//   if (!templateType) {
//     throw new Error("templateType is required for act generation");
//   }

//   const profiles = profilesByType[templateType];

//   if (!profiles || !profiles.length) {
//     throw new Error(
//       `No act profiles configured for templateType: ${templateType}`,
//     );
//   }

//   return profiles;
// };

// const getProfileCandidates = (report, documentConfig) => {
//   const { documentType, templateType } = report;

//   if (documentType === "order") {
//     throw new Error("runProfiles should not be used for order generation");
//   }

//   if (documentType === "act") {
//     const profiles = getActProfilesByTemplateType(documentConfig, templateType);

//     return profiles.map((profile) => ({
//       profileName: profile.name,
//       profile,
//     }));
//   }

//   const profiles = documentConfig.profiles || [];

//   return profiles.map((profile) => ({
//     profileName: profile.name,
//     profile,
//   }));
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
// }) => {
//   try {
//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(`[runProfiles] evaluating candidate: ${profileName}`);
//       console.log(
//         "[runProfiles] data preview:",
//         JSON.stringify(
//           payload.writeOffActs || payload.items || payload.rows || {},
//           null,
//           2,
//         ),
//       );
//     }

//     await generateDocx(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const pages = await validateLayout(pdfPath);
//     const hasLayoutError = pages.some((page) => page.status === "below_min");

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] layout result: ${profileName} => ${JSON.stringify(
//           pages,
//         )}`,
//       );
//     }

//     return {
//       ok: true,
//       profile: profileName,
//       pages,
//       hasLayoutError,
//     };
//   } catch (error) {
//     console.error(`[runProfiles] candidate failed: ${profileName}`);
//     console.error(error.message);

//     return {
//       ok: false,
//       profile: profileName,
//       pages: [],
//       hasLayoutError: true,
//       error: error.message,
//     };
//   }
// };

// const runProfiles = async (report, job) => {
//   const documentType = report.documentType;
//   const documentConfig = documents[documentType];

//   if (!documentConfig) {
//     throw new Error(`Document config not found for type: ${documentType}`);
//   }

//   const payload = buildPayload(report);
//   const docxPath = buildDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const candidates = getProfileCandidates(report, documentConfig);

//   if (!candidates.length) {
//     throw new Error(
//       `No profiles configured for document type: ${documentType}`,
//     );
//   }

//   let bestResult = null;

//   for (const candidate of candidates) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile: candidate.profile,
//       profileName: candidate.profileName,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       return {
//         status: "passed",
//         profile: result.profile,
//         pages: result.pages,
//       };
//     }

//     bestResult = {
//       status: "best_effort",
//       profile: result.profile,
//       pages: result.pages,
//     };
//   }

//   if (bestResult) {
//     return bestResult;
//   }

//   throw new Error(`No valid ${documentType} profile could be generated`);
// };

// module.exports = runProfiles;
// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const bestEffortSelector = require("./bestEffortSelector");
// const documents = require("../documents");

// const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

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

// const getActProfilesByTemplateType = (documentConfig, templateType) => {
//   const profilesByType = documentConfig.profiles || {};

//   if (!templateType) {
//     throw new Error("templateType is required for act generation");
//   }

//   const profiles = profilesByType[templateType];
//   if (!profiles || !profiles.length) {
//     throw new Error(
//       `No act profiles configured for templateType: ${templateType}`,
//     );
//   }

//   return profiles;
// };

// const getProfileCandidates = (report, documentConfig) => {
//   const { documentType, templateType } = report;

//   if (documentType === "order") {
//     throw new Error("runProfiles should not be used for order generation");
//   }

//   if (documentType === "act") {
//     const profiles = getActProfilesByTemplateType(documentConfig, templateType);
//     return profiles.map((profile) => ({
//       profileName: profile.name,
//       profile,
//     }));
//   }

//   const profiles = documentConfig.profiles || [];
//   return profiles.map((profile) => ({
//     profileName: profile.name,
//     profile,
//   }));
// };

// const buildValidationContext = (payload) => {
//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
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

//   if (payload.documentType === "order") {
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

//   return {
//     documentType: payload.documentType,
//     markers: {},
//   };
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
// }) => {
//   try {
//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(`[runProfiles] evaluating candidate: ${profileName}`);
//     }

//     await generateDocx(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload);
//     const layout = await validateLayout(pdfPath, validationContext);

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] layout result: ${profileName} => ${JSON.stringify(layout, null, 2)}`,
//       );
//     }

//     return {
//       ok: true,
//       profile: profileName,
//       pages: layout.pages,
//       hardViolations: layout.hardViolations,
//       marginViolations: layout.marginViolations,
//       hasLayoutError: !layout.passed,
//     };
//   } catch (error) {
//     console.error(`[runProfiles] candidate failed: ${profileName}`);
//     console.error(error.message);

//     return {
//       ok: false,
//       profile: profileName,
//       pages: [],
//       hardViolations: [],
//       marginViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//     };
//   }
// };

// const runProfiles = async (report, job) => {
//   const documentType = report.documentType;
//   const documentConfig = documents[documentType];

//   if (!documentConfig) {
//     throw new Error(`Document config not found for type: ${documentType}`);
//   }

//   const payload = buildPayload(report);
//   const docxPath = buildDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const candidates = getProfileCandidates(report, documentConfig);

//   if (!candidates.length) {
//     throw new Error(
//       `No profiles configured for document type: ${documentType}`,
//     );
//   }

//   const failedButGeneratedResults = [];

//   for (const candidate of candidates) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile: candidate.profile,
//       profileName: candidate.profileName,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       // return {
//       //   status: "passed",
//       //   profile: result.profile,
//       //   pages: result.pages,
//       //   hardViolations: result.hardViolations,
//       //   marginViolations: result.marginViolations,
//       // };
//       return {
//         status: "passed",
//         profile: result.profile,
//         pages: result.pages,
//         hardViolations: result.hardViolations,
//         marginViolations: result.marginViolations,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     // failedButGeneratedResults.push({
//     //   status: "best_effort",
//     //   profile: result.profile,
//     //   pages: result.pages,
//     //   hardViolations: result.hardViolations,
//     //   marginViolations: result.marginViolations,
//     // });
//     failedButGeneratedResults.push({
//       status: "best_effort",
//       profile: result.profile,
//       pages: result.pages,
//       hardViolations: result.hardViolations,
//       marginViolations: result.marginViolations,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     });
//   }

//   if (failedButGeneratedResults.length) {
//     return bestEffortSelector(failedButGeneratedResults);
//   }

//   throw new Error(`No valid ${documentType} profile could be generated`);
// };

// module.exports = runProfiles;
// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const bestEffortSelector = require("./bestEffortSelector");
// const documents = require("../documents");

// const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

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

// const getActProfilesByTemplateType = (documentConfig, templateType) => {
//   const profilesByType = documentConfig.profiles || {};

//   if (!templateType) {
//     throw new Error("templateType is required for act generation");
//   }

//   const profiles = profilesByType[templateType];
//   if (!profiles || !profiles.length) {
//     throw new Error(
//       `No act profiles configured for templateType: ${templateType}`,
//     );
//   }

//   return profiles;
// };

// const getProfileCandidates = (report, documentConfig) => {
//   const { documentType, templateType } = report;

//   if (documentType === "order") {
//     throw new Error("runProfiles should not be used for order generation");
//   }

//   if (documentType === "act") {
//     const profiles = getActProfilesByTemplateType(documentConfig, templateType);
//     return profiles.map((profile) => ({
//       profileName: profile.name,
//       profile,
//     }));
//   }

//   const profiles = documentConfig.profiles || [];
//   return profiles.map((profile) => ({
//     profileName: profile.name,
//     profile,
//   }));
// };

// const buildValidationContext = (payload) => {
//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
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

//   if (payload.documentType === "order") {
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

//   return {
//     documentType: payload.documentType,
//     markers: {},
//   };
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
// }) => {
//   try {
//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(`[runProfiles] evaluating candidate: ${profileName}`);
//     }

//     await generateDocx(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload);
//     const layout = await validateLayout(pdfPath, validationContext);

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] layout result: ${profileName} => ${JSON.stringify(layout, null, 2)}`,
//       );
//     }

//     return {
//       ok: true,
//       profile: profileName,
//       pages: layout.pages,
//       hardViolations: layout.hardViolations,
//       marginViolations: layout.marginViolations,
//       hasLayoutError: !layout.passed,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(`[runProfiles] candidate failed: ${profileName}`);
//     console.error(error.message);

//     return {
//       ok: false,
//       profile: profileName,
//       pages: [],
//       hardViolations: [],
//       marginViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runProfiles = async (report, job) => {
//   const documentType = report.documentType;
//   const documentConfig = documents[documentType];

//   if (!documentConfig) {
//     throw new Error(`Document config not found for type: ${documentType}`);
//   }

//   const payload = buildPayload(report);
//   const docxPath = buildDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const candidates = getProfileCandidates(report, documentConfig);

//   if (!candidates.length) {
//     throw new Error(
//       `No profiles configured for document type: ${documentType}`,
//     );
//   }

//   const failedButGeneratedResults = [];

//   for (const candidate of candidates) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile: candidate.profile,
//       profileName: candidate.profileName,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       return {
//         status: "passed",
//         profile: result.profile,
//         pages: result.pages,
//         hardViolations: result.hardViolations,
//         marginViolations: result.marginViolations,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     failedButGeneratedResults.push({
//       status: "best_effort",
//       profile: result.profile,
//       pages: result.pages,
//       hardViolations: result.hardViolations,
//       marginViolations: result.marginViolations,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     });
//   }

//   if (failedButGeneratedResults.length) {
//     return bestEffortSelector(failedButGeneratedResults);
//   }

//   throw new Error(`No valid ${documentType} profile could be generated`);
// };

// module.exports = runProfiles;
// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const bestEffortSelector = require("./bestEffortSelector");
// const documents = require("../documents");

// const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

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

// const getActProfilesByTemplateType = (documentConfig, templateType) => {
//   const profilesByType = documentConfig.profiles || {};

//   if (!templateType) {
//     throw new Error("templateType is required for act generation");
//   }

//   const profiles = profilesByType[templateType];
//   if (!profiles || !profiles.length) {
//     throw new Error(
//       `No act profiles configured for templateType: ${templateType}`,
//     );
//   }

//   return profiles;
// };

// const getProfileCandidates = (report, documentConfig) => {
//   const { documentType, templateType } = report;

//   if (documentType === "order") {
//     throw new Error("runProfiles should not be used for order generation");
//   }

//   if (documentType === "act") {
//     const profiles = getActProfilesByTemplateType(documentConfig, templateType);
//     return profiles.map((profile) => ({
//       profileName: profile.name,
//       profile,
//     }));
//   }

//   const profiles = documentConfig.profiles || [];
//   return profiles.map((profile) => ({
//     profileName: profile.name,
//     profile,
//   }));
// };

// const buildValidationContext = (payload) => {
//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
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

//   if (payload.documentType === "order") {
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

//   return {
//     documentType: payload.documentType,
//     markers: {},
//   };
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
// }) => {
//   const candidateStartedAt = Date.now();

//   try {
//     console.log(`[runProfiles] candidate-start profile=${profileName}`);

//     const docxStartedAt = Date.now();
//     await generateDocx(payload, docxPath, profile);
//     console.log(
//       `[runProfiles] candidate-docx-done profile=${profileName} durationMs=${Date.now() - docxStartedAt}`,
//     );

//     const pdfStartedAt = Date.now();
//     await convertToPdf(docxPath, pdfDir);
//     console.log(
//       `[runProfiles] candidate-pdf-done profile=${profileName} durationMs=${Date.now() - pdfStartedAt}`,
//     );

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload);

//     const validateStartedAt = Date.now();
//     const layout = await validateLayout(pdfPath, validationContext);
//     console.log(
//       `[runProfiles] candidate-validate-done profile=${profileName} durationMs=${Date.now() - validateStartedAt}`,
//     );

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] layout result: ${profileName} => ${JSON.stringify(layout, null, 2)}`,
//       );
//     }

//     console.log(
//       `[runProfiles] candidate-done profile=${profileName} totalDurationMs=${Date.now() - candidateStartedAt} passed=${layout.passed}`,
//     );

//     return {
//       ok: true,
//       profile: profileName,
//       pages: layout.pages,
//       hardViolations: layout.hardViolations,
//       marginViolations: layout.marginViolations,
//       hasLayoutError: !layout.passed,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(`[runProfiles] candidate-failed profile=${profileName}`);
//     console.error(error.message);

//     return {
//       ok: false,
//       profile: profileName,
//       pages: [],
//       hardViolations: [],
//       marginViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runProfiles = async (report, job) => {
//   const startedAt = Date.now();

//   const documentType = report.documentType;
//   const documentConfig = documents[documentType];

//   if (!documentConfig) {
//     throw new Error(`Document config not found for type: ${documentType}`);
//   }

//   const payload = buildPayload(report);
//   const docxPath = buildDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const candidates = getProfileCandidates(report, documentConfig);

//   console.log(
//     `[runProfiles] start job=${job._id} documentType=${documentType} candidates=${candidates.length}`,
//   );

//   if (!candidates.length) {
//     throw new Error(
//       `No profiles configured for document type: ${documentType}`,
//     );
//   }

//   const failedButGeneratedResults = [];

//   for (const candidate of candidates) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile: candidate.profile,
//       profileName: candidate.profileName,
//     });

//     if (!result.ok) {
//       console.log(
//         `[runProfiles] candidate-not-ok profile=${candidate.profileName}`,
//       );
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runProfiles] success job=${job._id} profile=${result.profile} totalDurationMs=${Date.now() - startedAt}`,
//       );

//       return {
//         status: "passed",
//         profile: result.profile,
//         pages: result.pages,
//         hardViolations: result.hardViolations,
//         marginViolations: result.marginViolations,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     console.log(
//       `[runProfiles] candidate-layout-failed profile=${result.profile}`,
//     );

//     failedButGeneratedResults.push({
//       status: "best_effort",
//       profile: result.profile,
//       pages: result.pages,
//       hardViolations: result.hardViolations,
//       marginViolations: result.marginViolations,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     });
//   }

//   if (failedButGeneratedResults.length) {
//     console.log(
//       `[runProfiles] best-effort-selected job=${job._id} totalDurationMs=${Date.now() - startedAt}`,
//     );

//     return bestEffortSelector(failedButGeneratedResults);
//   }

//   throw new Error(`No valid ${documentType} profile could be generated`);
// };

// module.exports = runProfiles;
// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const bestEffortSelector = require("./bestEffortSelector");
// const documents = require("../documents");

// const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

// const ACCEPTABLE_HARD_VIOLATION_CODES = new Set([
//   "PROSHU_LAST_LINE",
//   "PROSHU_NOT_ENOUGH_LINES_AFTER",
// ]);

// const MAX_ACCEPTABLE_MARGIN_VIOLATIONS = Number(
//   process.env.MAX_ACCEPTABLE_MARGIN_VIOLATIONS || 3,
// );

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

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

// const getActProfilesByTemplateType = (documentConfig, templateType) => {
//   const profilesByType = documentConfig.profiles || {};

//   if (!templateType) {
//     throw new Error("templateType is required for act generation");
//   }

//   const profiles = profilesByType[templateType];
//   if (!profiles || !profiles.length) {
//     throw new Error(
//       `No act profiles configured for templateType: ${templateType}`,
//     );
//   }

//   return profiles;
// };

// const getProfileCandidates = (report, documentConfig) => {
//   const { documentType, templateType } = report;

//   if (documentType === "order") {
//     throw new Error("runProfiles should not be used for order generation");
//   }

//   if (documentType === "act") {
//     const profiles = getActProfilesByTemplateType(documentConfig, templateType);
//     return profiles.map((profile) => ({
//       profileName: profile.name,
//       profile,
//     }));
//   }

//   const profiles = documentConfig.profiles || [];
//   return profiles.map((profile) => ({
//     profileName: profile.name,
//     profile,
//   }));
// };

// const buildValidationContext = (payload) => {
//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
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

//   if (payload.documentType === "order") {
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

//   return {
//     documentType: payload.documentType,
//     markers: {},
//   };
// };

// const isAcceptableBestEffort = (result) => {
//   const hardViolations = result.hardViolations || [];
//   const marginViolations = result.marginViolations || [];

//   const hasOnlyAcceptableHardViolations = hardViolations.every((violation) =>
//     ACCEPTABLE_HARD_VIOLATION_CODES.has(violation.code),
//   );

//   if (!hasOnlyAcceptableHardViolations) {
//     return false;
//   }

//   if (marginViolations.length > MAX_ACCEPTABLE_MARGIN_VIOLATIONS) {
//     return false;
//   }

//   return true;
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
// }) => {
//   const candidateStartedAt = Date.now();

//   try {
//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(`[runProfiles] candidate-start profile=${profileName}`);
//     }

//     const docxStartedAt = Date.now();
//     await generateDocx(payload, docxPath, profile);

//     const pdfStartedAt = Date.now();
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const validationContext = buildValidationContext(payload);

//     const validateStartedAt = Date.now();
//     const layout = await validateLayout(pdfPath, validationContext);

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] candidate-timings profile=${profileName} docxMs=${pdfStartedAt - docxStartedAt} pdfMs=${validateStartedAt - pdfStartedAt} validateMs=${Date.now() - validateStartedAt} totalMs=${Date.now() - candidateStartedAt}`,
//       );

//       console.log(
//         `[runProfiles] candidate-summary profile=${profileName} passed=${layout.passed} hard=${layout.hardViolations.length} margin=${layout.marginViolations.length}`,
//       );

//       console.log(
//         `[runProfiles] candidate-hard-codes profile=${profileName} codes=${JSON.stringify(layout.hardViolations.map((v) => v.code))}`,
//       );
//     }

//     return {
//       ok: true,
//       profile: profileName,
//       pages: layout.pages,
//       hardViolations: layout.hardViolations,
//       marginViolations: layout.marginViolations,
//       hasLayoutError: !layout.passed,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(`[runProfiles] candidate-failed profile=${profileName}`);
//     console.error(error.message);

//     return {
//       ok: false,
//       profile: profileName,
//       pages: [],
//       hardViolations: [],
//       marginViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runProfiles = async (report, job) => {
//   const startedAt = Date.now();

//   const documentType = report.documentType;
//   const documentConfig = documents[documentType];

//   if (!documentConfig) {
//     throw new Error(`Document config not found for type: ${documentType}`);
//   }

//   const payload = buildPayload(report);
//   const docxPath = buildDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const candidates = getProfileCandidates(report, documentConfig);

//   console.log(
//     `[runProfiles] start job=${job._id} documentType=${documentType} candidates=${candidates.length}`,
//   );

//   if (!candidates.length) {
//     throw new Error(
//       `No profiles configured for document type: ${documentType}`,
//     );
//   }

//   const failedButGeneratedResults = [];

//   for (const candidate of candidates) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile: candidate.profile,
//       profileName: candidate.profileName,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runProfiles] passed job=${job._id} profile=${result.profile} totalMs=${Date.now() - startedAt}`,
//       );

//       return {
//         status: "passed",
//         profile: result.profile,
//         pages: result.pages,
//         hardViolations: result.hardViolations,
//         marginViolations: result.marginViolations,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     if (isAcceptableBestEffort(result)) {
//       console.log(
//         `[runProfiles] acceptable-best-effort job=${job._id} profile=${result.profile} hard=${result.hardViolations.length} margin=${result.marginViolations.length} totalMs=${Date.now() - startedAt}`,
//       );

//       return {
//         status: "best_effort",
//         profile: result.profile,
//         pages: result.pages,
//         hardViolations: result.hardViolations,
//         marginViolations: result.marginViolations,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] rejected profile=${result.profile} hard=${result.hardViolations.length} margin=${result.marginViolations.length}`,
//       );
//     }

//     failedButGeneratedResults.push({
//       status: "best_effort",
//       profile: result.profile,
//       pages: result.pages,
//       hardViolations: result.hardViolations,
//       marginViolations: result.marginViolations,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     });
//   }

//   if (failedButGeneratedResults.length) {
//     console.log(
//       `[runProfiles] best-effort-selected job=${job._id} totalMs=${Date.now() - startedAt}`,
//     );

//     return bestEffortSelector(failedButGeneratedResults);
//   }

//   throw new Error(`No valid ${documentType} profile could be generated`);
// };

// module.exports = runProfiles;
// const fs = require("fs/promises");
// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const { applyDocumentPaginationFixes } = require("../word");
// const validateLayout = require("./validateLayout");
// const bestEffortSelector = require("./bestEffortSelector");
// const documents = require("../documents");

// const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

// const ACCEPTABLE_HARD_VIOLATION_CODES = new Set([
//   "PROSHU_LAST_LINE",
//   "PROSHU_NOT_ENOUGH_LINES_AFTER",
// ]);

// const MAX_ACCEPTABLE_MARGIN_VIOLATIONS = Number(
//   process.env.MAX_ACCEPTABLE_MARGIN_VIOLATIONS || 3,
// );

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const cleanupFileIfExists = async (filePath) => {
//   try {
//     await fs.unlink(filePath);
//   } catch (error) {
//     if (error.code !== "ENOENT") {
//       console.warn(`[runProfiles] cleanup failed: ${filePath}`);
//       console.warn(error.message);
//     }
//   }
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

// const getActProfilesByTemplateType = (documentConfig, templateType) => {
//   const profilesByType = documentConfig.profiles || {};

//   if (!templateType) {
//     throw new Error("templateType is required for act generation");
//   }

//   const profiles = profilesByType[templateType];
//   if (!profiles || !profiles.length) {
//     throw new Error(
//       `No act profiles configured for templateType: ${templateType}`,
//     );
//   }

//   return profiles;
// };

// const getProfileCandidates = (report, documentConfig) => {
//   const { documentType, templateType } = report;

//   if (documentType === "order") {
//     throw new Error("runProfiles should not be used for order generation");
//   }

//   if (documentType === "act") {
//     const profiles = getActProfilesByTemplateType(documentConfig, templateType);
//     return profiles.map((profile) => ({
//       profileName: profile.name,
//       profile,
//     }));
//   }

//   const profiles = documentConfig.profiles || [];
//   return profiles.map((profile) => ({
//     profileName: profile.name,
//     profile,
//   }));
// };

// const buildValidationContext = (payload) => {
//   if (payload.documentType === "report") {
//     const signer = payload.data?.signer || {};

//     return {
//       documentType: "report",
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

//   if (payload.documentType === "order") {
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

//   return {
//     documentType: payload.documentType,
//     markers: {},
//   };
// };

// const isAcceptableBestEffort = (result) => {
//   const hardViolations = result.hardViolations || [];
//   const marginViolations = result.marginViolations || [];

//   const hasOnlyAcceptableHardViolations = hardViolations.every((violation) =>
//     ACCEPTABLE_HARD_VIOLATION_CODES.has(violation.code),
//   );

//   if (!hasOnlyAcceptableHardViolations) {
//     return false;
//   }

//   if (marginViolations.length > MAX_ACCEPTABLE_MARGIN_VIOLATIONS) {
//     return false;
//   }

//   return true;
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
// }) => {
//   const candidateStartedAt = Date.now();

//   try {
//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(`[runProfiles] candidate-start profile=${profileName}`);
//     }

//     const docxStartedAt = Date.now();
//     await generateDocx(payload, docxPath, profile);

//     if (payload.documentType === "report") {
//       const generatedDocxBuffer = await fs.readFile(docxPath);
//       const fixedDocxBuffer = applyDocumentPaginationFixes(
//         generatedDocxBuffer,
//         {
//           documentType: "report",
//         },
//       );
//       await fs.writeFile(docxPath, fixedDocxBuffer);
//     }

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     await cleanupFileIfExists(pdfPath);

//     const pdfStartedAt = Date.now();
//     await convertToPdf(docxPath, pdfDir);

//     const validationContext = buildValidationContext(payload);

//     const validateStartedAt = Date.now();
//     const layout = await validateLayout(pdfPath, validationContext);

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] candidate-timings profile=${profileName} docxMs=${pdfStartedAt - docxStartedAt} pdfMs=${validateStartedAt - pdfStartedAt} validateMs=${Date.now() - validateStartedAt} totalMs=${Date.now() - candidateStartedAt}`,
//       );

//       console.log(
//         `[runProfiles] candidate-summary profile=${profileName} passed=${layout.passed} hard=${layout.hardViolations.length} margin=${layout.marginViolations.length}`,
//       );

//       console.log(
//         `[runProfiles] candidate-hard-codes profile=${profileName} codes=${JSON.stringify(layout.hardViolations.map((v) => v.code))}`,
//       );
//     }

//     return {
//       ok: true,
//       profile: profileName,
//       pages: layout.pages,
//       hardViolations: layout.hardViolations,
//       marginViolations: layout.marginViolations,
//       hasLayoutError: !layout.passed,
//       docxPath,
//       pdfPath,
//     };
//   } catch (error) {
//     console.error(`[runProfiles] candidate-failed profile=${profileName}`);
//     console.error(error.message);

//     return {
//       ok: false,
//       profile: profileName,
//       pages: [],
//       hardViolations: [],
//       marginViolations: [],
//       hasLayoutError: true,
//       error: error.message,
//       docxPath,
//       pdfPath: buildPdfPath(docxPath, pdfDir),
//     };
//   }
// };

// const runProfiles = async (report, job) => {
//   const startedAt = Date.now();

//   const documentType = report.documentType;
//   const documentConfig = documents[documentType];

//   if (!documentConfig) {
//     throw new Error(`Document config not found for type: ${documentType}`);
//   }

//   const payload = buildPayload(report);
//   const docxPath = buildDocxPath(job);
//   const pdfDir = buildPdfDir();
//   const candidates = getProfileCandidates(report, documentConfig);

//   console.log(
//     `[runProfiles] start job=${job._id} documentType=${documentType} candidates=${candidates.length}`,
//   );

//   if (!candidates.length) {
//     throw new Error(
//       `No profiles configured for document type: ${documentType}`,
//     );
//   }

//   const failedButGeneratedResults = [];

//   for (const candidate of candidates) {
//     const result = await evaluateCandidate({
//       payload,
//       docxPath,
//       pdfDir,
//       profile: candidate.profile,
//       profileName: candidate.profileName,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runProfiles] passed job=${job._id} profile=${result.profile} totalMs=${Date.now() - startedAt}`,
//       );

//       return {
//         status: "passed",
//         profile: result.profile,
//         pages: result.pages,
//         hardViolations: result.hardViolations,
//         marginViolations: result.marginViolations,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     if (isAcceptableBestEffort(result)) {
//       console.log(
//         `[runProfiles] acceptable-best-effort job=${job._id} profile=${result.profile} hard=${result.hardViolations.length} margin=${result.marginViolations.length} totalMs=${Date.now() - startedAt}`,
//       );

//       return {
//         status: "best_effort",
//         profile: result.profile,
//         pages: result.pages,
//         hardViolations: result.hardViolations,
//         marginViolations: result.marginViolations,
//         docxPath: result.docxPath,
//         pdfPath: result.pdfPath,
//       };
//     }

//     if (DEBUG_REPORT_LAYOUT) {
//       console.log(
//         `[runProfiles] rejected profile=${result.profile} hard=${result.hardViolations.length} margin=${result.marginViolations.length}`,
//       );
//     }

//     failedButGeneratedResults.push({
//       status: "best_effort",
//       profile: result.profile,
//       pages: result.pages,
//       hardViolations: result.hardViolations,
//       marginViolations: result.marginViolations,
//       docxPath: result.docxPath,
//       pdfPath: result.pdfPath,
//     });
//   }

//   if (failedButGeneratedResults.length) {
//     console.log(
//       `[runProfiles] best-effort-selected job=${job._id} totalMs=${Date.now() - startedAt}`,
//     );

//     return bestEffortSelector(failedButGeneratedResults);
//   }

//   throw new Error(`No valid ${documentType} profile could be generated`);
// };

// module.exports = runProfiles;
const fs = require("fs/promises");
const path = require("path");
const { generateDocx } = require("../docx");
const { convertToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const forceReportProshuBlockToNextPage = require("../word/forceReportProshuBlockToNextPage");
const validateLayout = require("./validateLayout");
const bestEffortSelector = require("./bestEffortSelector");
const evaluateReportProshuPlacement = require("../generation/evaluateReportProshuPlacement");
const documents = require("../documents");

const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

const ACCEPTABLE_HARD_VIOLATION_CODES = new Set([
  "PROSHU_LAST_LINE",
  "PROSHU_NOT_ENOUGH_LINES_AFTER",
]);

const MAX_ACCEPTABLE_MARGIN_VIOLATIONS = Number(
  process.env.MAX_ACCEPTABLE_MARGIN_VIOLATIONS || 3,
);

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildDocxPath = (job) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);

const buildReportFallbackDocxPath = (job) =>
  path.join(
    process.cwd(),
    "storage",
    "docx",
    `${job._id}_report_fallback.docx`,
  );

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanupFileIfExists = async (filePath, options = {}) => {
  const retries = Number.isInteger(options.retries) ? options.retries : 6;
  const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 300;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await fs.unlink(filePath);
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
        console.warn(`[runProfiles] cleanup failed: ${filePath}`);
        console.warn(error.message);
        return false;
      }

      await sleep(delayMs);
    }
  }

  return false;
};

const cleanupArtifacts = async (paths) => {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  for (const filePath of uniquePaths) {
    await cleanupFileIfExists(filePath);
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

const getActProfilesByTemplateType = (documentConfig, templateType) => {
  const profilesByType = documentConfig.profiles || {};

  if (!templateType) {
    throw new Error("templateType is required for act generation");
  }

  const profiles = profilesByType[templateType];
  if (!profiles || !profiles.length) {
    throw new Error(
      `No act profiles configured for templateType: ${templateType}`,
    );
  }

  return profiles;
};

const getProfileCandidates = (report, documentConfig) => {
  const { documentType, templateType } = report;

  if (documentType === "order") {
    throw new Error("runProfiles should not be used for order generation");
  }

  if (documentType === "act") {
    const profiles = getActProfilesByTemplateType(documentConfig, templateType);
    return profiles.map((profile) => ({
      profileName: profile.name,
      profile,
    }));
  }

  const profiles = documentConfig.profiles || [];
  return profiles.map((profile) => ({
    profileName: profile.name,
    profile,
  }));
};

const buildValidationContext = (payload) => {
  if (payload.documentType === "report") {
    const signer = payload.data?.signer || {};

    return {
      documentType: "report",
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

  if (payload.documentType === "order") {
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

  return {
    documentType: payload.documentType,
    markers: {},
  };
};

const validateCandidateLayout = async (pdfPath, payload) => {
  const validationContext = buildValidationContext(payload);
  return validateLayout(pdfPath, validationContext);
};

// const applyReportPaginationFixesToFile = async (docxPath) => {
//   const generatedDocxBuffer = await fs.readFile(docxPath);
//   const fixedDocxBuffer = applyDocumentPaginationFixes(generatedDocxBuffer, {
//     documentType: "report",
//   });
//   await fs.writeFile(docxPath, fixedDocxBuffer);
// };
const applyReportPaginationFixesToFile = async (docxPath, profile) => {
  const generatedDocxBuffer = await fs.readFile(docxPath);
  const fixedDocxBuffer = applyDocumentPaginationFixes(generatedDocxBuffer, {
    documentType: "report",
    reportFormatting: profile?.reportFormatting,
  });
  await fs.writeFile(docxPath, fixedDocxBuffer);
};

const getHardViolationCodes = (result) =>
  (result?.hardViolations || []).map((item) => item.code);

const isAcceptableBestEffort = (result) => {
  const hardViolations = result.hardViolations || [];
  const marginViolations = result.marginViolations || [];

  const hasOnlyAcceptableHardViolations = hardViolations.every((violation) =>
    ACCEPTABLE_HARD_VIOLATION_CODES.has(violation.code),
  );

  if (!hasOnlyAcceptableHardViolations) {
    return false;
  }

  if (marginViolations.length > MAX_ACCEPTABLE_MARGIN_VIOLATIONS) {
    return false;
  }

  return true;
};

const shouldTryReportFallback = (result) => {
  if (!result?.layout) {
    return false;
  }

  if (!result.hasLayoutError) {
    return false;
  }

  const evaluation = evaluateReportProshuPlacement(result.layout, {
    maxMarginViolationsForFallback: MAX_ACCEPTABLE_MARGIN_VIOLATIONS,
  });

  return evaluation.shouldRunFallback;
};

const getStopDecision = (result) => {
  if (!result?.ok) {
    return {
      shouldStop: false,
      reason: "candidate_failed",
    };
  }

  if (!result.hasLayoutError) {
    return {
      shouldStop: true,
      reason: "passed",
    };
  }

  if (isAcceptableBestEffort(result)) {
    return {
      shouldStop: true,
      reason: "acceptable_best_effort",
    };
  }

  return {
    shouldStop: false,
    reason: "layout_not_acceptable",
  };
};

const logRejectReason = (jobId, result) => {
  const hardCodes = getHardViolationCodes(result);
  const marginCount = (result.marginViolations || []).length;

  const unacceptableHardCodes = hardCodes.filter(
    (code) => !ACCEPTABLE_HARD_VIOLATION_CODES.has(code),
  );

  console.warn(
    `[runProfiles] continue-after-profile job=${jobId} profile=${result.profile} reason=layout_not_acceptable hardCodes=${JSON.stringify(hardCodes)} unacceptableHardCodes=${JSON.stringify(unacceptableHardCodes)} margin=${marginCount}`,
  );
};

const evaluateCandidate = async ({
  payload,
  docxPath,
  pdfDir,
  profile,
  profileName,
}) => {
  const candidateStartedAt = Date.now();
  const pdfPath = buildPdfPath(docxPath, pdfDir);

  try {
    console.log(`[runProfiles] candidate-start profile=${profileName}`);

    await cleanupFileIfExists(docxPath);
    await cleanupFileIfExists(pdfPath);

    const docxStartedAt = Date.now();
    await cleanupFileIfExists(docxPath);
    await generateDocx(payload, docxPath, profile);

    // if (payload.documentType === "report") {
    //   await applyReportPaginationFixesToFile(docxPath);
    // }
    if (payload.documentType === "report") {
      await applyReportPaginationFixesToFile(docxPath, profile);
    }

    const pdfStartedAt = Date.now();
    await convertToPdf(docxPath, pdfDir);

    const validateStartedAt = Date.now();
    const layout = await validateCandidateLayout(pdfPath, payload);

    console.log(
      `[runProfiles] candidate-timings profile=${profileName} docxMs=${pdfStartedAt - docxStartedAt} pdfMs=${validateStartedAt - pdfStartedAt} validateMs=${Date.now() - validateStartedAt} totalMs=${Date.now() - candidateStartedAt}`,
    );

    console.log(
      `[runProfiles] candidate-summary profile=${profileName} passed=${layout.passed} hard=${layout.hardViolations.length} margin=${layout.marginViolations.length}`,
    );

    console.log(
      `[runProfiles] candidate-hard-codes profile=${profileName} codes=${JSON.stringify(layout.hardViolations.map((v) => v.code))}`,
    );

    return {
      ok: true,
      profile: profileName,
      profileConfig: profile,
      pages: layout.pages,
      hardViolations: layout.hardViolations,
      marginViolations: layout.marginViolations,
      hasLayoutError: !layout.passed,
      docxPath,
      pdfPath,
      layout,
      artifacts: [docxPath, pdfPath],
    };
  } catch (error) {
    console.error(`[runProfiles] candidate-failed profile=${profileName}`);
    console.error(error.message);

    return {
      ok: false,
      profile: profileName,
      profileConfig: profile,
      pages: [],
      hardViolations: [],
      marginViolations: [],
      hasLayoutError: true,
      error: error.message,
      docxPath,
      pdfPath,
      layout: null,
      artifacts: [docxPath, pdfPath],
    };
  }
};

const runReportFallbackPass = async ({
  job,
  payload,
  sourceDocxPath,
  pdfDir,
}) => {
  const fallbackDocxPath = buildReportFallbackDocxPath(job);
  const fallbackPdfPath = buildPdfPath(fallbackDocxPath, pdfDir);

  await cleanupFileIfExists(fallbackDocxPath);
  await cleanupFileIfExists(fallbackPdfPath);

  const sourceBuffer = await fs.readFile(sourceDocxPath);
  const forcedBuffer = forceReportProshuBlockToNextPage(sourceBuffer, {
    markerText: "ПРОШУ:",
    previousContextText: "На підставі вищезазначеного,",
  });

  await fs.writeFile(fallbackDocxPath, forcedBuffer);
  await convertToPdf(fallbackDocxPath, pdfDir);

  const layout = await validateCandidateLayout(fallbackPdfPath, payload);

  console.log(
    `[runProfiles] fallback-summary passed=${layout.passed} hard=${layout.hardViolations.length} margin=${layout.marginViolations.length}`,
  );
  console.log(
    `[runProfiles] fallback-hard-codes codes=${JSON.stringify(layout.hardViolations.map((v) => v.code))}`,
  );

  return {
    status: layout.passed ? "passed" : "best_effort",
    profile: null,
    pages: layout.pages,
    hardViolations: layout.hardViolations,
    marginViolations: layout.marginViolations,
    docxPath: fallbackDocxPath,
    pdfPath: fallbackPdfPath,
    layout,
    fallbackUsed: true,
    artifacts: [fallbackDocxPath, fallbackPdfPath],
  };
};

const runProfiles = async (report, job) => {
  const startedAt = Date.now();
  const tempArtifacts = [];
  const preservedArtifacts = new Set();

  const documentType = report.documentType;
  const documentConfig = documents[documentType];

  if (!documentConfig) {
    throw new Error(`Document config not found for type: ${documentType}`);
  }

  const payload = buildPayload(report);
  const docxPath = buildDocxPath(job);
  const pdfDir = buildPdfDir();
  const candidates = getProfileCandidates(report, documentConfig);

  console.log(
    `[runProfiles] start job=${job._id} documentType=${documentType} candidates=${candidates.length}`,
  );

  if (!candidates.length) {
    throw new Error(
      `No profiles configured for document type: ${documentType}`,
    );
  }

  const failedButGeneratedResults = [];

  try {
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      console.log(
        `[runProfiles] candidate-index job=${job._id} current=${i + 1}/${candidates.length} profile=${candidate.profileName}`,
      );

      const result = await evaluateCandidate({
        payload,
        docxPath,
        pdfDir,
        profile: candidate.profile,
        profileName: candidate.profileName,
      });

      tempArtifacts.push(...(result.artifacts || []));

      if (!result.ok) {
        console.warn(
          `[runProfiles] continue-after-profile job=${job._id} profile=${candidate.profileName} reason=candidate_failed`,
        );
        continue;
      }

      if (documentType === "report" && shouldTryReportFallback(result)) {
        const proshuPlacement = evaluateReportProshuPlacement(result.layout, {
          maxMarginViolationsForFallback: MAX_ACCEPTABLE_MARGIN_VIOLATIONS,
        });

        console.warn(
          `[runProfiles] report-fallback-triggered job=${job._id} profile=${result.profile} reason=${proshuPlacement.reason} proshuHard=${proshuPlacement.proshuViolations.length} margin=${proshuPlacement.marginViolations.length}`,
        );

        const fallbackResult = await runReportFallbackPass({
          job,
          payload,
          sourceDocxPath: result.docxPath,
          pdfDir,
        });

        tempArtifacts.push(...(fallbackResult.artifacts || []));
        fallbackResult.profile = result.profile;

        const fallbackDecision = getStopDecision(fallbackResult);

        if (fallbackDecision.shouldStop) {
          preservedArtifacts.add(fallbackResult.docxPath);
          preservedArtifacts.add(fallbackResult.pdfPath);

          console.log(
            `[runProfiles] stop job=${job._id} profile=${result.profile} reason=report_fallback_${fallbackDecision.reason} totalMs=${Date.now() - startedAt}`,
          );

          return {
            status:
              fallbackDecision.reason === "passed" ? "passed" : "best_effort",
            profile: fallbackResult.profile,
            pages: fallbackResult.pages,
            hardViolations: fallbackResult.hardViolations,
            marginViolations: fallbackResult.marginViolations,
            docxPath: fallbackResult.docxPath,
            pdfPath: fallbackResult.pdfPath,
            fallbackUsed: true,
          };
        }

        console.warn(
          `[runProfiles] continue-after-fallback job=${job._id} profile=${result.profile} reason=${fallbackDecision.reason}`,
        );
        logRejectReason(job._id, fallbackResult);
      }

      const stopDecision = getStopDecision(result);

      if (stopDecision.shouldStop) {
        preservedArtifacts.add(result.docxPath);
        preservedArtifacts.add(result.pdfPath);

        console.log(
          `[runProfiles] stop job=${job._id} profile=${result.profile} reason=${stopDecision.reason} totalMs=${Date.now() - startedAt}`,
        );

        return {
          status: stopDecision.reason === "passed" ? "passed" : "best_effort",
          profile: result.profile,
          pages: result.pages,
          hardViolations: result.hardViolations,
          marginViolations: result.marginViolations,
          docxPath: result.docxPath,
          pdfPath: result.pdfPath,
        };
      }

      logRejectReason(job._id, result);

      failedButGeneratedResults.push({
        status: "best_effort",
        profile: result.profile,
        pages: result.pages,
        hardViolations: result.hardViolations,
        marginViolations: result.marginViolations,
        docxPath: result.docxPath,
        pdfPath: result.pdfPath,
      });
    }

    if (failedButGeneratedResults.length) {
      const selected = bestEffortSelector(failedButGeneratedResults);

      preservedArtifacts.add(selected.docxPath);
      preservedArtifacts.add(selected.pdfPath);

      console.warn(
        `[runProfiles] no-early-stop-best-effort-selected job=${job._id} totalMs=${Date.now() - startedAt} selectedProfile=${selected.profile}`,
      );

      return selected;
    }

    throw new Error(`No valid ${documentType} profile could be generated`);
  } finally {
    const artifactsToCleanup = tempArtifacts.filter(
      (filePath) => !preservedArtifacts.has(filePath),
    );

    if (artifactsToCleanup.length) {
      await sleep(500);
      await cleanupArtifacts(artifactsToCleanup);
    }
  }
};

module.exports = runProfiles;
