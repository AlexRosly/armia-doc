// const profiles = require("./profiles");

// const generateDocx = require("../docx/generateDocx");

// const convertToPdf = require("../pdf/convertToPdf");

// const validateLayout = require("./validateLayout");

// module.exports = async function runProfiles() {
//   return {
//     status: "passed",
//     profile: "default_14_100_top_20",
//     pages: [],
//   };
// };

// const validateLayout = require("./validateLayout");

// const runProfiles = async (pdfPath) => {
//   const pages = await validateLayout(pdfPath);

//   const hasErrors = pages.some((page) => page.deviationCm > 0);

//   return {
//     status: hasErrors ? "best_effort" : "passed",

//     profile: "default_14_100_top_20",

//     pages,
//   };
// };
// const path = require("path");
// const profiles = require("./profiles");
// const bestEffortSelector = require("./bestEffortSelector");
/////////////05.07
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");

// const runProfiles = async (report, job) => {
//   let bestResult = null;

//   const documentConfig = documents[report.documentType];

//   const profiles = documentConfig.profiles;

//   for (const profile of profiles) {
//     const docxPath = path.join(
//       process.cwd(),
//       "storage",
//       "docx",
//       `${job._id}.docx`,
//     );

//     const pdfDir = path.join(process.cwd(), "storage", "pdf");

//     console.log("[runProfiles] report.documentType:", report.documentType);
//     console.log("[runProfiles] profile:", profile);
//     console.log("[runProfiles] docxPath:", docxPath);

//     await generateDocx(report.toObject(), docxPath, profile);

//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = path.join(pdfDir, `${job._id}.pdf`);

//     const pages = await validateLayout(pdfPath);

//     const hasError = pages.some((page) => page.status === "below_min");

//     if (!hasError) {
//       return {
//         status: "passed",

//         profile: profile.name,

//         pages,
//       };
//     }

//     bestResult = {
//       status: "best_effort",

//       profile: profile.name,

//       pages,
//     };
//   }
//   return bestResult;
// };
/////////////05.07
// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const getProfileCandidates = (documentType, documentConfig) => {
//   if (documentType === "order") {
//     const { orderProfiles = [], approvalProfiles = [] } =
//       documentConfig.profiles || {};

//     return orderProfiles.flatMap((orderProfile) =>
//       approvalProfiles.map((approvalProfile) => ({
//         profileName: `${orderProfile.name} + ${approvalProfile.name}`,
//         profile: {
//           orderProfile,
//           approvalProfile,
//         },
//       })),
//     );
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
//     await generateDocx(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);
//     const pages = await validateLayout(pdfPath);
//     const hasLayoutError = pages.some((page) => page.status === "below_min");

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
//   const candidates = getProfileCandidates(documentType, documentConfig);

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
//06.07.26
// const path = require("path");
// const { generateDocx } = require("../docx");
// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");
// const documents = require("../documents");

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

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
//     const { orderProfiles = [], approvalProfiles = [] } =
//       documentConfig.profiles || {};

//     return orderProfiles.flatMap((orderProfile) =>
//       approvalProfiles.map((approvalProfile) => ({
//         profileName: `${orderProfile.name} + ${approvalProfile.name}`,
//         profile: {
//           orderProfile,
//           approvalProfile,
//         },
//       })),
//     );
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
//     await generateDocx(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);
//     const pages = await validateLayout(pdfPath);
//     const hasLayoutError = pages.some((page) => page.status === "below_min");

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
const path = require("path");
const { generateDocx } = require("../docx");
const { convertToPdf } = require("../pdf");
const validateLayout = require("./validateLayout");
const documents = require("../documents");

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildDocxPath = (job) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

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

const evaluateCandidate = async ({
  payload,
  docxPath,
  pdfDir,
  profile,
  profileName,
}) => {
  try {
    await generateDocx(payload, docxPath, profile);
    await convertToPdf(docxPath, pdfDir);

    const pdfPath = path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);
    const pages = await validateLayout(pdfPath);
    const hasLayoutError = pages.some((page) => page.status === "below_min");

    return {
      ok: true,
      profile: profileName,
      pages,
      hasLayoutError,
    };
  } catch (error) {
    console.error(`[runProfiles] candidate failed: ${profileName}`);
    console.error(error.message);

    return {
      ok: false,
      profile: profileName,
      pages: [],
      hasLayoutError: true,
      error: error.message,
    };
  }
};

const runProfiles = async (report, job) => {
  const documentType = report.documentType;
  const documentConfig = documents[documentType];

  if (!documentConfig) {
    throw new Error(`Document config not found for type: ${documentType}`);
  }

  const payload = buildPayload(report);
  const docxPath = buildDocxPath(job);
  const pdfDir = buildPdfDir();
  const candidates = getProfileCandidates(report, documentConfig);

  if (!candidates.length) {
    throw new Error(
      `No profiles configured for document type: ${documentType}`,
    );
  }

  let bestResult = null;

  for (const candidate of candidates) {
    const result = await evaluateCandidate({
      payload,
      docxPath,
      pdfDir,
      profile: candidate.profile,
      profileName: candidate.profileName,
    });

    if (!result.ok) {
      continue;
    }

    if (!result.hasLayoutError) {
      return {
        status: "passed",
        profile: result.profile,
        pages: result.pages,
      };
    }

    bestResult = {
      status: "best_effort",
      profile: result.profile,
      pages: result.pages,
    };
  }

  if (bestResult) {
    return bestResult;
  }

  throw new Error(`No valid ${documentType} profile could be generated`);
};

module.exports = runProfiles;
