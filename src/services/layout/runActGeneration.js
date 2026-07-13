const fs = require("fs/promises");
const path = require("path");

const convertToPdf = require("../pdf/convertToPdf");
const validateLayout = require("./validateLayout");

const {
  generateActDocument,
  resolveActLayoutProfile,
} = require("../documents/act");
const actProfiles = require("../documents/act/profiles");

const DEBUG_ACT_LAYOUT = process.env.ACT_LAYOUT_DEBUG === "1";
const MAX_CHECKED_PROFILES = Number(
  process.env.ACT_MAX_CHECKED_PROFILES || 1000,
);

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
    if (error.code !== "ENOENT" && DEBUG_ACT_LAYOUT) {
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

const isFatalGenerationError = (error) => {
  const message = error?.message || "";

  return (
    error?.code === "ENOENT" ||
    message.includes("no such file or directory") ||
    message.includes("payload.templateType is required") ||
    message.includes("generateSingleDocument is not defined") ||
    message.includes("generateSingleDocument is not a function") ||
    message.includes("path is not defined") ||
    message.includes("Act profile.template is required") ||
    message.includes("Unknown act layoutProfile")
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

    let pages = [];

    try {
      pages = await validateLayout(pdfPath);
    } catch (validationError) {
      if (DEBUG_ACT_LAYOUT) {
        console.warn(
          `[runActGeneration] validateLayout failed for ${profileName}`,
        );
        console.warn(validationError.message);
      }
    }

    if (DEBUG_ACT_LAYOUT && pages.length > 0) {
      console.log(
        `[runActGeneration] layout result: ${profileName} => ${JSON.stringify(
          pages.map((p) => ({
            pageNumber: p.pageNumber,
            status: p.status,
            actualBottomMarginCm: p.actualBottomMarginCm,
            deviationCm: p.deviationCm,
          })),
        )}`,
      );
    }

    return {
      ok: true,
      profileName,
      profile,
      pages,
      docxPath,
      pdfPath,
    };
  } catch (error) {
    if (DEBUG_ACT_LAYOUT) {
      console.warn(`[runActGeneration] candidate failed: ${profileName}`);
      console.warn(error.message);
    }

    if (isFatalGenerationError(error)) {
      throw error;
    }

    return {
      ok: false,
      profileName,
      profile,
      pages: [],
      error: error.message,
      docxPath,
      pdfPath,
    };
  }
};

const finalizeResult = async ({
  sourceDocxPath,
  finalDocxPath,
  finalPdfPath,
  pdfDir,
}) => {
  await ensureParentDir(finalDocxPath);
  await ensureParentDir(finalPdfPath);

  await cleanupFileIfExists(finalDocxPath);
  await cleanupFileIfExists(finalPdfPath);

  await fs.copyFile(sourceDocxPath, finalDocxPath);
  await convertToPdf(finalDocxPath, pdfDir);
};

const runActGeneration = async (report, job) => {
  const payload = buildPayload(report);
  const layoutProfile = resolveActLayoutProfile(payload);
  const profiles = actProfiles[layoutProfile];
  const pdfDir = buildPdfDir();
  const finalDocxPath = buildFinalDocxPath(job);
  const finalPdfPath = buildFinalPdfPath(job);

  const tempArtifacts = new Set();

  if (!profiles || profiles.length === 0) {
    throw new Error(`Unknown act layoutProfile: ${layoutProfile}`);
  }

  console.log(
    `[runActGeneration] selecting act template list, layoutProfile=${layoutProfile}, total=${profiles.length}`,
  );

  try {
    let checkedCount = 0;

    for (const profile of profiles) {
      checkedCount += 1;

      if (checkedCount > MAX_CHECKED_PROFILES) {
        console.warn(
          `[runActGeneration] reached profile limit ${MAX_CHECKED_PROFILES}, stopping search`,
        );
        break;
      }

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

      console.log(
        `[runActGeneration] act passed with profile=${result.profileName}, checked=${checkedCount}`,
      );

      await finalizeResult({
        sourceDocxPath: result.docxPath,
        finalDocxPath,
        finalPdfPath,
        pdfDir,
      });

      return {
        status: "passed",
        profile: result.profileName,
        layoutCheck: {
          status: "passed",
          profile: result.profileName,
          pages: result.pages,
        },
        resolvedProfile: result.profile,
        outputPath: finalDocxPath,
      };
    }

    throw new Error("No valid act template could be generated");
  } finally {
    tempArtifacts.delete(finalDocxPath);
    tempArtifacts.delete(finalPdfPath);
    await cleanupArtifacts(tempArtifacts);
  }
};

module.exports = runActGeneration;
