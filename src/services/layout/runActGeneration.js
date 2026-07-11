const fs = require("fs/promises");
const path = require("path");

const convertToPdf = require("../pdf/convertToPdf");
const validateLayout = require("./validateLayout");

const generateActDocument = require("../documents/act/generate");
const resolveActLayoutProfile = require("../documents/act/resolveActLayoutProfile");
const iterateActProfiles = require("../documents/act/iterateActProfiles");
const getCachedActProfile = require("../documents/act/getCachedActProfile");
const saveCachedActProfile = require("../documents/act/saveCachedActProfile");

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

const buildFinalDocxPath = (job) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

const buildFinalPdfPath = (job) =>
  path.join(process.cwd(), "storage", "pdf", `${job._id}.pdf`);

const buildCandidateDocxPath = (job, index) =>
  path.join(
    process.cwd(),
    "storage",
    "docx",
    `${job._id}__candidate_${String(index).padStart(4, "0")}.docx`,
  );

const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const ensureParentDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const cleanupFileIfExists = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`[runActGeneration] cleanup failed: ${filePath}`);
      console.warn(error.message);
    }
  }
};

const cleanupArtifacts = async (paths) => {
  for (const filePath of paths) {
    await cleanupFileIfExists(filePath);
  }
};

const sameProfile = (a, b) =>
  !!a &&
  !!b &&
  a.layoutProfile === b.layoutProfile &&
  a.approvalAreaLineSpacing === b.approvalAreaLineSpacing &&
  a.documentTitleSpacingBeforePt === b.documentTitleSpacingBeforePt &&
  a.verticalSpacingBeforePt === b.verticalSpacingBeforePt &&
  a.mainTextPt === b.mainTextPt &&
  a.mainLineSpacing === b.mainLineSpacing &&
  a.tableTextPt === b.tableTextPt &&
  a.signatureBlockPt === b.signatureBlockPt &&
  a.signatureHintPt === b.signatureHintPt &&
  a.staticHeaderPt === b.staticHeaderPt &&
  a.tableLineSpacing === b.tableLineSpacing &&
  a.headingsKeepWithNext === b.headingsKeepWithNext &&
  a.signatureBlockKeepTogether === b.signatureBlockKeepTogether;

const isFatalGenerationError = (error) => {
  const message = error?.message || "";

  return (
    error?.code === "ENOENT" ||
    message.includes("no such file or directory") ||
    message.includes("DOCX does not contain") ||
    message.includes("Unknown act layoutProfile") ||
    message.includes("payload.templateType is required") ||
    message.includes("generateSingleDocument is not defined") ||
    message.includes("generateSingleDocument is not a function") ||
    message.includes("path is not defined")
  );
};

const evaluateCandidate = async ({
  payload,
  docxPath,
  pdfDir,
  profile,
  profileName,
  tempArtifacts,
}) => {
  const pdfPath = buildPdfPath(docxPath, pdfDir);

  tempArtifacts.add(docxPath);
  tempArtifacts.add(pdfPath);

  try {
    await ensureParentDir(docxPath);
    await fs.mkdir(pdfDir, { recursive: true });

    await cleanupFileIfExists(docxPath);
    await cleanupFileIfExists(pdfPath);

    await generateActDocument(payload, docxPath, profile);
    await convertToPdf(docxPath, pdfDir);

    const pages = await validateLayout(pdfPath);
    const hasLayoutError = pages.some((page) => page.status === "below_min");

    return {
      ok: true,
      profileName,
      profile,
      pages,
      hasLayoutError,
      docxPath,
      pdfPath,
    };
  } catch (error) {
    console.error(`[runActGeneration] candidate failed: ${profileName}`);
    console.error(error.message);

    if (isFatalGenerationError(error)) {
      throw error;
    }

    return {
      ok: false,
      profileName,
      profile,
      pages: [],
      hasLayoutError: true,
      error: error.message,
      docxPath,
      pdfPath,
    };
  }
};

const runActGeneration = async (report, job) => {
  const payload = buildPayload(report);
  const layoutProfile = resolveActLayoutProfile(payload);
  const pdfDir = buildPdfDir();
  const finalDocxPath = buildFinalDocxPath(job);
  const finalPdfPath = buildFinalPdfPath(job);

  const tempArtifacts = new Set();

  console.log(
    `[runActGeneration] selecting act profile, layoutProfile=${layoutProfile}`,
  );

  let bestResult = null;
  const cachedProfile = await getCachedActProfile(payload, layoutProfile);

  try {
    if (cachedProfile) {
      console.log("[runActGeneration] trying cached profile");

      const cachedDocxPath = buildCandidateDocxPath(job, 0);

      const cachedResult = await evaluateCandidate({
        payload,
        docxPath: cachedDocxPath,
        pdfDir,
        profile: cachedProfile,
        profileName: cachedProfile.name || "cached_profile",
        tempArtifacts,
      });

      if (cachedResult.ok) {
        if (!cachedResult.hasLayoutError) {
          console.log(
            `[runActGeneration] cached profile passed: ${cachedResult.profileName}`,
          );

          await ensureParentDir(finalDocxPath);
          await ensureParentDir(finalPdfPath);

          await cleanupFileIfExists(finalDocxPath);
          await cleanupFileIfExists(finalPdfPath);

          await fs.copyFile(cachedResult.docxPath, finalDocxPath);
          await convertToPdf(finalDocxPath, pdfDir);

          return {
            status: "passed",
            profile: cachedResult.profileName,
            layoutCheck: {
              status: "passed",
              profile: cachedResult.profileName,
              pages: cachedResult.pages,
            },
            resolvedProfile: cachedResult.profile,
            outputPath: finalDocxPath,
          };
        }

        bestResult = {
          status: "best_effort",
          profileName: cachedResult.profileName,
          profile: cachedResult.profile,
          pages: cachedResult.pages,
          docxPath: cachedResult.docxPath,
        };

        console.warn(
          `[runActGeneration] cached profile only best_effort: ${cachedResult.profileName}`,
        );
      }
    }

    let checkedCount = 0;

    for (const profile of iterateActProfiles(layoutProfile)) {
      if (sameProfile(profile, cachedProfile)) {
        continue;
      }

      checkedCount += 1;

      if (checkedCount % 25 === 0) {
        console.log(
          `[runActGeneration] checked=${checkedCount}, currentProfile=${profile.name}`,
        );
      }

      const candidateDocxPath = buildCandidateDocxPath(job, checkedCount);

      const result = await evaluateCandidate({
        payload,
        docxPath: candidateDocxPath,
        pdfDir,
        profile,
        profileName: profile.name,
        tempArtifacts,
      });

      if (!result.ok) {
        continue;
      }

      if (!result.hasLayoutError) {
        console.log(
          `[runActGeneration] act passed with profile=${result.profileName}`,
        );

        await saveCachedActProfile(payload, layoutProfile, profile);

        await ensureParentDir(finalDocxPath);
        await ensureParentDir(finalPdfPath);

        await cleanupFileIfExists(finalDocxPath);
        await cleanupFileIfExists(finalPdfPath);

        await fs.copyFile(result.docxPath, finalDocxPath);
        await convertToPdf(finalDocxPath, pdfDir);

        return {
          status: "passed",
          profile: result.profileName,
          layoutCheck: {
            status: "passed",
            profile: result.profileName,
            pages: result.pages,
          },
          resolvedProfile: profile,
          outputPath: finalDocxPath,
        };
      }

      if (!bestResult) {
        bestResult = {
          status: "best_effort",
          profileName: result.profileName,
          profile: result.profile,
          pages: result.pages,
          docxPath: result.docxPath,
        };
      }
    }

    if (bestResult) {
      console.warn(
        `[runActGeneration] fallback to best_effort profile=${bestResult.profileName}`,
      );

      await ensureParentDir(finalDocxPath);
      await ensureParentDir(finalPdfPath);

      await cleanupFileIfExists(finalDocxPath);
      await cleanupFileIfExists(finalPdfPath);

      await fs.copyFile(bestResult.docxPath, finalDocxPath);
      await convertToPdf(finalDocxPath, pdfDir);

      return {
        status: "best_effort",
        profile: bestResult.profileName,
        layoutCheck: {
          status: "best_effort",
          profile: bestResult.profileName,
          pages: bestResult.pages,
        },
        resolvedProfile: bestResult.profile,
        outputPath: finalDocxPath,
      };
    }

    throw new Error("No valid act profile could be generated");
  } finally {
    tempArtifacts.delete(finalDocxPath);
    tempArtifacts.delete(finalPdfPath);
    await cleanupArtifacts(tempArtifacts);
  }
};

module.exports = runActGeneration;
// const fs = require("fs/promises");
// const path = require("path");

// const { convertToPdf } = require("../pdf");
// const validateLayout = require("./validateLayout");

// const {
//   generateActDocument,
//   resolveActLayoutProfile,
//   iterateActProfiles,
//   getCachedActProfile,
//   saveCachedActProfile,
// } = require("../documents/act");

// const buildPayload = (report) => ({
//   ...report.toObject(),
//   documentType: report.documentType,
//   templateType: report.templateType,
// });

// const buildDocxPath = (job) =>
//   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// // const buildFinalDocxPath = (job) =>
// //   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// const buildPdfPath = (docxPath, pdfDir) =>
//   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// const ensureParentDir = async (filePath) => {
//   await fs.mkdir(path.dirname(filePath), { recursive: true });
// };

// const sameProfile = (a, b) =>
//   !!a &&
//   !!b &&
//   a.layoutProfile === b.layoutProfile &&
//   a.approvalAreaLineSpacing === b.approvalAreaLineSpacing &&
//   a.documentTitleSpacingBeforePt === b.documentTitleSpacingBeforePt &&
//   a.verticalSpacingBeforePt === b.verticalSpacingBeforePt &&
//   a.mainTextPt === b.mainTextPt &&
//   a.mainLineSpacing === b.mainLineSpacing &&
//   a.tableTextPt === b.tableTextPt;

// const isFatalGenerationError = (error) => {
//   const message = error?.message || "";

//   return (
//     error?.code === "ENOENT" ||
//     message.includes("no such file or directory") ||
//     message.includes("DOCX does not contain") ||
//     message.includes("Unknown act layoutProfile") ||
//     message.includes("payload.templateType is required") ||
//     message.includes("generateSingleDocument is not defined") ||
//     message.includes("path is not defined")
//   );
// };

// const evaluateCandidate = async ({
//   payload,
//   docxPath,
//   pdfDir,
//   profile,
//   profileName,
// }) => {
//   try {
//     await ensureParentDir(docxPath);

//     await generateActDocument(payload, docxPath, profile);
//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = buildPdfPath(docxPath, pdfDir);
//     const pages = await validateLayout(pdfPath);
//     const hasLayoutError = pages.some((page) => page.status === "below_min");

//     return {
//       ok: true,
//       profileName,
//       profile,
//       pages,
//       hasLayoutError,
//     };
//   } catch (error) {
//     console.error(`[runActGeneration] candidate failed: ${profileName}`);
//     console.error(error.message);

//     if (isFatalGenerationError(error)) {
//       throw error;
//     }

//     return {
//       ok: false,
//       profileName,
//       profile,
//       pages: [],
//       hasLayoutError: true,
//       error: error.message,
//     };
//   }
// };

// const runActGeneration = async (report, job) => {
//   const payload = buildPayload(report);
//   const layoutProfile = resolveActLayoutProfile(payload);

//   const candidateDocxPath = buildDocxPath(job, "act");
//   const finalDocxPath = buildDocxPath(job);
//   const pdfDir = buildPdfDir();

//   console.log(
//     `[runActGeneration] selecting act profile, layoutProfile=${layoutProfile}`,
//   );

//   let bestResult = null;

//   const cachedProfile = await getCachedActProfile(payload, layoutProfile);

//   if (cachedProfile) {
//     console.log("[runActGeneration] trying cached profile");

//     const cachedResult = await evaluateCandidate({
//       payload,
//       docxPath: candidateDocxPath,
//       pdfDir,
//       profile: cachedProfile,
//       profileName: cachedProfile.name || "cached_profile",
//     });

//     if (cachedResult.ok) {
//       if (!cachedResult.hasLayoutError) {
//         console.log(
//           `[runActGeneration] cached profile passed: ${cachedResult.profileName}`,
//         );

//         await fs.copyFile(candidateDocxPath, finalDocxPath);
//         await convertToPdf(finalDocxPath, pdfDir);

//         return {
//           status: "passed",
//           profile: cachedResult.profileName,
//           layoutCheck: {
//             status: "passed",
//             profile: cachedResult.profileName,
//             pages: cachedResult.pages,
//           },
//           resolvedProfile: cachedResult.profile,
//           outputPath: finalDocxPath,
//         };
//       }

//       bestResult = {
//         status: "best_effort",
//         profileName: cachedResult.profileName,
//         profile: cachedResult.profile,
//         pages: cachedResult.pages,
//       };

//       console.warn(
//         `[runActGeneration] cached profile only best_effort: ${cachedResult.profileName}`,
//       );
//     }
//   }

//   let checkedCount = 0;

//   for (const profile of iterateActProfiles(layoutProfile)) {
//     if (sameProfile(profile, cachedProfile)) {
//       continue;
//     }

//     checkedCount += 1;

//     if (checkedCount % 25 === 0) {
//       console.log(
//         `[runActGeneration] checked=${checkedCount}, currentProfile=${profile.name}`,
//       );
//     }

//     const result = await evaluateCandidate({
//       payload,
//       docxPath: candidateDocxPath,
//       pdfDir,
//       profile,
//       profileName: profile.name,
//     });

//     if (!result.ok) {
//       continue;
//     }

//     if (!result.hasLayoutError) {
//       console.log(
//         `[runActGeneration] act passed with profile=${result.profileName}`,
//       );

//       await saveCachedActProfile(payload, layoutProfile, profile);
//       // await fs.copyFile(candidateDocxPath, finalDocxPath);
//       await convertToPdf(finalDocxPath, pdfDir);

//       return {
//         status: "passed",
//         profile: result.profileName,
//         layoutCheck: {
//           status: "passed",
//           profile: result.profileName,
//           pages: result.pages,
//         },
//         resolvedProfile: profile,
//         outputPath: finalDocxPath,
//       };
//     }

//     if (!bestResult) {
//       bestResult = {
//         status: "best_effort",
//         profileName: result.profileName,
//         profile: result.profile,
//         pages: result.pages,
//       };
//     }
//   }

//   if (bestResult) {
//     console.warn(
//       `[runActGeneration] fallback to best_effort profile=${bestResult.profileName}`,
//     );

//     await fs.copyFile(candidateDocxPath, finalDocxPath);
//     await convertToPdf(finalDocxPath, pdfDir);

//     return {
//       status: "best_effort",
//       profile: bestResult.profileName,
//       layoutCheck: {
//         status: "best_effort",
//         profile: bestResult.profileName,
//         pages: bestResult.pages,
//       },
//       resolvedProfile: bestResult.profile,
//       outputPath: finalDocxPath,
//     };
//   }

//   throw new Error("No valid act profile could be generated");
// };

// module.exports = runActGeneration;
// // const fs = require("fs/promises");
// // const path = require("path");

// // const { convertToPdf } = require("../pdf");
// // const validateLayout = require("./validateLayout");

// // const {
// //   generateActDocument,
// //   resolveActLayoutProfile,
// //   iterateActProfiles,
// //   getCachedActProfile,
// //   saveCachedActProfile,
// // } = require("../documents/act");

// // const buildPayload = (report) => ({
// //   ...report.toObject(),
// //   documentType: report.documentType,
// //   templateType: report.templateType,
// // });

// // const buildDocxPath = (job, suffix = "act") =>
// //   path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

// // const buildFinalDocxPath = (job) =>
// //   path.join(process.cwd(), "storage", "docx", `${job._id}.docx`);

// // const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

// // const buildPdfPath = (docxPath, pdfDir) =>
// //   path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

// // const ensureParentDir = async (filePath) => {
// //   await fs.mkdir(path.dirname(filePath), { recursive: true });
// // };

// // const sameProfile = (a, b) =>
// //   !!a &&
// //   !!b &&
// //   a.layoutProfile === b.layoutProfile &&
// //   a.approvalAreaLineSpacing === b.approvalAreaLineSpacing &&
// //   a.documentTitleSpacingBeforePt === b.documentTitleSpacingBeforePt &&
// //   a.verticalSpacingBeforePt === b.verticalSpacingBeforePt &&
// //   a.mainTextPt === b.mainTextPt &&
// //   a.mainLineSpacing === b.mainLineSpacing &&
// //   a.tableTextPt === b.tableTextPt;

// // const evaluateCandidate = async ({
// //   payload,
// //   docxPath,
// //   pdfDir,
// //   profile,
// //   profileName,
// // }) => {
// //   try {
// //     await ensureParentDir(docxPath);

// //     await generateActDocument(payload, docxPath, profile);
// //     await convertToPdf(docxPath, pdfDir);

// //     const pdfPath = buildPdfPath(docxPath, pdfDir);
// //     const pages = await validateLayout(pdfPath);
// //     const hasLayoutError = pages.some((page) => page.status === "below_min");

// //     return {
// //       ok: true,
// //       profileName,
// //       profile,
// //       pages,
// //       hasLayoutError,
// //     };
// //   } catch (error) {
// //     console.error(`[runActGeneration] candidate failed: ${profileName}`);
// //     console.error(error.message);

// //     if (isFatalGenerationError(error)) {
// //       throw error;
// //     }

// //     return {
// //       ok: false,
// //       profileName,
// //       profile,
// //       pages: [],
// //       hasLayoutError: true,
// //       error: error.message,
// //     };
// //   }
// // };

// // const runActGeneration = async (report, job) => {
// //   const payload = buildPayload(report);
// //   const layoutProfile = resolveActLayoutProfile(payload);

// //   const candidateDocxPath = buildDocxPath(job, "act");
// //   const finalDocxPath = buildFinalDocxPath(job);
// //   const pdfDir = buildPdfDir();

// //   console.log(
// //     `[runActGeneration] selecting act profile, layoutProfile=${layoutProfile}`,
// //   );

// //   let bestResult = null;

// //   // const isFatalGenerationError = (error) => {
// //   //   const message = error?.message || "";

// //   //   return (
// //   //     error?.code === "ENOENT" ||
// //   //     message.includes("no such file or directory") ||
// //   //     message.includes("DOCX does not contain") ||
// //   //     message.includes("Unknown act layoutProfile")
// //   //   );
// //   // };

// //   // 1. Пытаемся cached profile
// //   const cachedProfile = await getCachedActProfile(payload, layoutProfile);

// //   if (cachedProfile) {
// //     console.log("[runActGeneration] trying cached profile");

// //     const cachedResult = await evaluateCandidate({
// //       payload,
// //       docxPath: candidateDocxPath,
// //       pdfDir,
// //       profile: cachedProfile,
// //       profileName: cachedProfile.name || "cached_profile",
// //     });

// //     if (cachedResult.ok) {
// //       if (!cachedResult.hasLayoutError) {
// //         console.log(
// //           `[runActGeneration] cached profile passed: ${cachedResult.profileName}`,
// //         );

// //         await fs.copyFile(candidateDocxPath, finalDocxPath);

// //         return {
// //           status: "passed",
// //           profile: cachedResult.profileName,
// //           layoutCheck: {
// //             status: "passed",
// //             profile: cachedResult.profileName,
// //             pages: cachedResult.pages,
// //           },
// //           resolvedProfile: cachedResult.profile,
// //           outputPath: finalDocxPath,
// //         };
// //       }

// //       bestResult = {
// //         status: "best_effort",
// //         profileName: cachedResult.profileName,
// //         profile: cachedResult.profile,
// //         pages: cachedResult.pages,
// //       };

// //       console.warn(
// //         `[runActGeneration] cached profile only best_effort: ${cachedResult.profileName}`,
// //       );
// //     }
// //   }

// //   // 2. Полный ordered search по ТЗ
// //   let checkedCount = 0;

// //   for (const profile of iterateActProfiles(layoutProfile)) {
// //     if (sameProfile(profile, cachedProfile)) {
// //       continue;
// //     }

// //     checkedCount += 1;

// //     if (checkedCount % 25 === 0) {
// //       console.log(
// //         `[runActGeneration] checked=${checkedCount}, currentProfile=${profile.name}`,
// //       );
// //     }

// //     const result = await evaluateCandidate({
// //       payload,
// //       docxPath: candidateDocxPath,
// //       pdfDir,
// //       profile,
// //       profileName: profile.name,
// //     });

// //     if (!result.ok) {
// //       continue;
// //     }

// //     if (!result.hasLayoutError) {
// //       console.log(
// //         `[runActGeneration] act passed with profile=${result.profileName}`,
// //       );

// //       await saveCachedActProfile(payload, layoutProfile, profile);
// //       await fs.copyFile(candidateDocxPath, finalDocxPath);

// //       return {
// //         status: "passed",
// //         profile: result.profileName,
// //         layoutCheck: {
// //           status: "passed",
// //           profile: result.profileName,
// //           pages: result.pages,
// //         },
// //         resolvedProfile: profile,
// //         outputPath: finalDocxPath,
// //       };
// //     }

// //     if (!bestResult) {
// //       bestResult = {
// //         status: "best_effort",
// //         profileName: result.profileName,
// //         profile: result.profile,
// //         pages: result.pages,
// //       };
// //     }
// //   }

// //   if (bestResult) {
// //     console.warn(
// //       `[runActGeneration] fallback to best_effort profile=${bestResult.profileName}`,
// //     );

// //     await fs.copyFile(candidateDocxPath, finalDocxPath);
// //     await convertToPdf(finalDocxPath, pdfDir);

// //     return {
// //       status: "best_effort",
// //       profile: bestResult.profileName,
// //       layoutCheck: {
// //         status: "best_effort",
// //         profile: bestResult.profileName,
// //         pages: bestResult.pages,
// //       },
// //       resolvedProfile: bestResult.profile,
// //       outputPath: finalDocxPath,
// //     };
// //   }

// //   throw new Error("No valid act profile could be generated");
// // };

// // module.exports = runActGeneration;
