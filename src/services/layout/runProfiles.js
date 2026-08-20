const fs = require("fs/promises");
const path = require("path");

const { generateDocx } = require("../docx");
const { convertToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const validateLayout = require("./validateLayout");
const bestEffortSelector = require("./bestEffortSelector");
const documents = require("../documents");
const { tryBottomMarginFallback } = require("./tryBottomMarginFallback");

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildFinalDocxPath = (job) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}_report.docx`);
const buildCandidateDocxPath = (job, index) =>
  path.join(
    process.cwd(),
    "storage",
    "docx",
    `${job._id}_report_candidate_${String(index + 1).padStart(4, "0")}.docx`,
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
      if (error.code === "ENOENT") return true;
      const retryable = ["EBUSY", "EPERM", "EACCES"].includes(error.code);
      if (!retryable || attempt === retries) return false;
      await sleep(delayMs);
    }
  }
  return false;
};

const cleanupArtifacts = async (paths) => {
  for (const filePath of [...new Set(paths.filter(Boolean))]) {
    await cleanupFileIfExists(filePath);
  }
};

const promoteCandidate = async (candidate, finalDocxPath, finalPdfPath) => {
  await cleanupFileIfExists(finalDocxPath);
  await cleanupFileIfExists(finalPdfPath);
  await fs.rename(candidate.docxPath, finalDocxPath);
  await fs.rename(candidate.pdfPath, finalPdfPath);
  return { ...candidate, docxPath: finalDocxPath, pdfPath: finalPdfPath };
};

const formatSignerDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const reportValidationContext = (payload) => {
  const signer = payload.data?.signer || {};
  return {
    documentType: "report",
    expectedBottomMarginCm: 2.0,
    minAllowedBottomMarginCm: 1.9,
    maxAllowedBottomMarginCm: 2.1,
    systemicWhitespaceThresholdCm: 2.1,
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
};

const actValidationContext = (payload) => ({
  documentType: payload.documentType,
  expectedBottomMarginCm: 2.0,
  minAllowedBottomMarginCm: 1.9,
  maxAllowedBottomMarginCm: 3.2,
  systemicWhitespaceThresholdCm: 2.2,
  systemicWhitespaceMinShare: 0.5,
  markers: {},
});

const evaluateCandidate = async ({ payload, profile, profileName, docxPath, context }) => {
  const pdfDir = buildPdfDir();
  const pdfPath = buildPdfPath(docxPath, pdfDir);
  try {
    await cleanupFileIfExists(docxPath);
    await cleanupFileIfExists(pdfPath);
    await generateDocx(payload, docxPath, profile);

    if (payload.documentType === "report") {
      const source = await fs.readFile(docxPath);
      const fixed = applyDocumentPaginationFixes(source, {
        documentType: "report",
        reportFormatting: profile?.reportFormatting,
      });
      await fs.writeFile(docxPath, fixed);
    }

    await convertToPdf(docxPath, pdfDir);
    const layout = await validateLayout(pdfPath, context);
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
      layoutFlags: layout.layoutFlags,
      systemicWhitespace: layout.systemicWhitespace,
      artifacts: [docxPath, pdfPath],
    };
  } catch (error) {
    return {
      ok: false,
      profile: profileName,
      profileConfig: profile,
      pages: [],
      hardViolations: [],
      marginViolations: [],
      error: error.message,
      docxPath,
      pdfPath,
      artifacts: [docxPath, pdfPath],
    };
  }
};

const hasUnsafeBottom = (result) =>
  (result.marginViolations || []).some((item) => item.status === "below_min");

const selectClosestSafeReport = (results) =>
  results.slice().sort((a, b) => {
    const score = (candidate) => {
      const deviations = candidate.marginViolations.map(
        (item) => Number(item.deviationCm || 0),
      );
      return [
        candidate.marginViolations.length,
        Math.max(...deviations, 0),
        deviations.reduce((sum, value) => sum + value, 0),
      ];
    };
    const A = score(a);
    const B = score(b);
    return A[0] - B[0] || A[1] - B[1] || A[2] - B[2];
  })[0];

const runReportProfiles = async (report, job, documentConfig) => {
  const payload = buildPayload(report);
  const profiles = documentConfig.profiles || [];
  if (!profiles.length) throw new Error("No report profiles configured");

  const finalDocxPath = buildFinalDocxPath(job);
  const finalPdfPath = buildPdfPath(finalDocxPath, buildPdfDir());
  const artifacts = [];
  const safeCandidates = [];

  try {
    for (let index = 0; index < profiles.length; index++) {
      const profile = profiles[index];
      const result = await evaluateCandidate({
        payload,
        profile,
        profileName: profile.name,
        docxPath: buildCandidateDocxPath(job, index),
        context: reportValidationContext(payload),
      });
      artifacts.push(...result.artifacts);
      if (!result.ok) continue;

      const hardOk = result.hardViolations.length === 0;
      const markerOk = result.layoutFlags?.proshuOk === true;
      const signatureOk = result.layoutFlags?.signatureOk === true;
      if (!hardOk || !markerOk || !signatureOk || hasUnsafeBottom(result)) continue;

      if (result.layout.passed) {
        return await promoteCandidate(
          { ...result, status: "passed", fallbackUsed: false },
          finalDocxPath,
          finalPdfPath,
        );
      }
      safeCandidates.push(result);
    }

    const selected = selectClosestSafeReport(safeCandidates);
    if (!selected) {
      throw new Error(
        "No safe report profile: every candidate violates a hard rule or goes below 1.9 cm",
      );
    }
    return await promoteCandidate(
      { ...selected, status: "best_effort", fallbackUsed: false },
      finalDocxPath,
      finalPdfPath,
    );
  } finally {
    await cleanupArtifacts(
      artifacts.filter(
        (filePath) => filePath !== finalDocxPath && filePath !== finalPdfPath,
      ),
    );
  }
};

const getActProfiles = (report, documentConfig) => {
  if (!report.templateType) throw new Error("templateType is required for act generation");
  const profiles = documentConfig.profiles?.[report.templateType];
  if (!profiles?.length) {
    throw new Error(`No act profiles configured for templateType: ${report.templateType}`);
  }
  return profiles;
};

const runLegacyActProfiles = async (report, job, documentConfig) => {
  const payload = buildPayload(report);
  const profiles = getActProfiles(report, documentConfig);
  const outputDocxPath = buildFinalDocxPath(job);
  const outputPdfPath = buildPdfPath(outputDocxPath, buildPdfDir());
  const artifacts = [];
  const preserved = new Set();
  const failed = [];

  try {
    for (const profile of profiles) {
      const result = await evaluateCandidate({
        payload,
        profile,
        profileName: profile.name,
        docxPath: outputDocxPath,
        context: actValidationContext(payload),
      });
      artifacts.push(...result.artifacts);
      if (!result.ok) continue;

      if (!result.systemicWhitespace?.triggered) {
        preserved.add(result.docxPath);
        preserved.add(result.pdfPath);
        return {
          status: result.layout.passed ? "passed" : "best_effort",
          profile: result.profile,
          pages: result.pages,
          hardViolations: result.hardViolations,
          marginViolations: result.marginViolations,
          docxPath: result.docxPath,
          pdfPath: result.pdfPath,
          fallbackUsed: false,
        };
      }

      const fallback = await tryBottomMarginFallback({
        payload,
        profileName: result.profile,
        baseDocxPath: result.docxPath,
        pdfDir: buildPdfDir(),
        cleanupFileIfExists,
      });
      artifacts.push(...(fallback.artifacts || []));
      if (fallback.decision === "accept-alt") {
        await cleanupFileIfExists(outputDocxPath);
        await cleanupFileIfExists(outputPdfPath);
        await fs.rename(fallback.alt.docxPath, outputDocxPath);
        await fs.rename(fallback.alt.pdfPath, outputPdfPath);
        preserved.add(outputDocxPath);
        preserved.add(outputPdfPath);
        return {
          status: fallback.alt.layout.passed ? "passed" : "best_effort",
          profile: result.profile,
          pages: fallback.alt.layout.pages,
          hardViolations: fallback.alt.layout.hardViolations,
          marginViolations: fallback.alt.layout.marginViolations,
          docxPath: outputDocxPath,
          pdfPath: outputPdfPath,
          fallbackUsed: true,
        };
      }

      failed.push({
        status: "best_effort",
        profile: result.profile,
        pages: result.pages,
        hardViolations: result.hardViolations,
        marginViolations: result.marginViolations,
        docxPath: result.docxPath,
        pdfPath: result.pdfPath,
        systemicWhitespaceScore: result.systemicWhitespace?.score ?? null,
      });
    }

    const selected = bestEffortSelector(failed);
    if (!selected) throw new Error("No valid act profile could be generated");
    preserved.add(selected.docxPath);
    preserved.add(selected.pdfPath);
    return selected;
  } finally {
    await cleanupArtifacts(artifacts.filter((filePath) => !preserved.has(filePath)));
  }
};

const runProfiles = async (report, job) => {
  if (report.documentType === "order") {
    throw new Error("runProfiles should not be used for order generation");
  }
  const documentConfig = documents[report.documentType];
  if (!documentConfig) {
    throw new Error(`Document config not found for type: ${report.documentType}`);
  }

  if (report.documentType === "report") {
    return runReportProfiles(report, job, documentConfig);
  }

  // Preserve the existing act path, metric and fallback behavior.
  return runLegacyActProfiles(report, job, documentConfig);
};

module.exports = runProfiles;
