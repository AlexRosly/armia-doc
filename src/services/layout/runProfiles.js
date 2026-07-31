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
const path = require("path");
const { generateDocx } = require("../docx");
const { convertToPdf } = require("../pdf");
const validateLayout = require("./validateLayout");
const bestEffortSelector = require("./bestEffortSelector");
const documents = require("../documents");

const DEBUG_REPORT_LAYOUT = process.env.REPORT_LAYOUT_DEBUG === "1";

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildDocxPath = (job) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

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

const evaluateCandidate = async ({
  payload,
  docxPath,
  pdfDir,
  profile,
  profileName,
}) => {
  try {
    if (DEBUG_REPORT_LAYOUT) {
      console.log(`[runProfiles] evaluating candidate: ${profileName}`);
    }

    await generateDocx(payload, docxPath, profile);
    await convertToPdf(docxPath, pdfDir);

    const pdfPath = buildPdfPath(docxPath, pdfDir);
    const validationContext = buildValidationContext(payload);
    const layout = await validateLayout(pdfPath, validationContext);

    if (DEBUG_REPORT_LAYOUT) {
      console.log(
        `[runProfiles] layout result: ${profileName} => ${JSON.stringify(layout, null, 2)}`,
      );
    }

    return {
      ok: true,
      profile: profileName,
      pages: layout.pages,
      hardViolations: layout.hardViolations,
      marginViolations: layout.marginViolations,
      hasLayoutError: !layout.passed,
      docxPath,
      pdfPath,
    };
  } catch (error) {
    console.error(`[runProfiles] candidate failed: ${profileName}`);
    console.error(error.message);

    return {
      ok: false,
      profile: profileName,
      pages: [],
      hardViolations: [],
      marginViolations: [],
      hasLayoutError: true,
      error: error.message,
      docxPath,
      pdfPath: buildPdfPath(docxPath, pdfDir),
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

  const failedButGeneratedResults = [];

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
        hardViolations: result.hardViolations,
        marginViolations: result.marginViolations,
        docxPath: result.docxPath,
        pdfPath: result.pdfPath,
      };
    }

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
    return bestEffortSelector(failedButGeneratedResults);
  }

  throw new Error(`No valid ${documentType} profile could be generated`);
};

module.exports = runProfiles;
