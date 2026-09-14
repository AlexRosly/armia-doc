const generationStorageRoot = require("../generation/storageRoot");
const fs = require("fs/promises");
const path = require("path");

const { generateDocx } = require("../docx");
const { convertToPdf, convertManyToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const forceMarkerBlockPageBreak = require("../word/forceMarkerBlockPageBreak");
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
  path.join(generationStorageRoot(), "docx", `${job._id}_report.docx`);
const buildCandidateDocxPath = (job, index) =>
  path.join(
    generationStorageRoot(),
    "docx",
    `${job._id}_report_candidate_${String(index + 1).padStart(4, "0")}.docx`,
  );
const buildPdfDir = () => path.join(generationStorageRoot(), "pdf");
const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveProfileBatchSize = () => {
  const configured = Number(process.env.PROFILE_CONVERSION_BATCH_SIZE || 4);
  if (!Number.isFinite(configured)) return 4;
  return Math.max(1, Math.min(8, Math.floor(configured)));
};

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

const evaluateReportCandidateBatch = async ({
  payload,
  candidates,
  context,
}) => {
  if (candidates.length <= 1) {
    return Promise.all(
      candidates.map((candidate) =>
        evaluateCandidate({ ...candidate, payload, context }),
      ),
    );
  }

  const pdfDir = buildPdfDir();

  try {
    const prepared = [];

    // DOCX generation stays sequential. Only the expensive LibreOffice startup
    // is shared by the profiles in this batch.
    for (const candidate of candidates) {
      const pdfPath = buildPdfPath(candidate.docxPath, pdfDir);
      await cleanupFileIfExists(candidate.docxPath);
      await cleanupFileIfExists(pdfPath);
      await generateDocx(payload, candidate.docxPath, candidate.profile);

      const source = await fs.readFile(candidate.docxPath);
      const fixed = applyDocumentPaginationFixes(source, {
        documentType: "report",
        reportFormatting: candidate.profile?.reportFormatting,
      });
      await fs.writeFile(candidate.docxPath, fixed);

      prepared.push({ ...candidate, pdfPath });
    }

    await convertManyToPdf(
      prepared.map((candidate) => candidate.docxPath),
      pdfDir,
    );

    const results = [];
    for (const candidate of prepared) {
      const layout = await validateLayout(candidate.pdfPath, context);
      results.push({
        ok: true,
        profile: candidate.profileName,
        profileConfig: candidate.profile,
        pages: layout.pages,
        hardViolations: layout.hardViolations,
        marginViolations: layout.marginViolations,
        hasLayoutError: !layout.passed,
        docxPath: candidate.docxPath,
        pdfPath: candidate.pdfPath,
        layout,
        layoutFlags: layout.layoutFlags,
        systemicWhitespace: layout.systemicWhitespace,
        artifacts: [candidate.docxPath, candidate.pdfPath],
        conversionMode: "batch",
      });
    }
    return results;
  } catch (error) {
    // Any batch-level anomaly falls back to the exact v3 one-by-one pipeline.
    // This may redo up to eight candidates, but it cannot change selection.
    console.warn(
      `[runProfiles] report batch failed; retrying one by one: ${error.message}`,
    );
    const results = [];
    for (const candidate of candidates) {
      results.push(
        await evaluateCandidate({ ...candidate, payload, context }),
      );
    }
    return results;
  }
};

const hasUnsafeBottom = (result) =>
  (result.marginViolations || []).some((item) => item.status === "below_min");

const REPORT_MARKER_MISSING_CODES = new Set(["PROSHU_MISSING"]);
const REPORT_MARKER_PAGINATION_CODES = new Set([
  "PROSHU_LAST_LINE",
  "PROSHU_NOT_ENOUGH_LINES_AFTER",
]);

const countReportCodes = (candidate, codes) =>
  (candidate.hardViolations || []).filter((item) => codes.has(item.code)).length;

const hasRepairableReportMarkerViolation = (candidate) =>
  countReportCodes(candidate, REPORT_MARKER_PAGINATION_CODES) > 0;

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

const reportBestEffortScore = (candidate) => {
  const hard = candidate.hardViolations || [];
  const margins = candidate.marginViolations || [];
  const below = margins.filter((item) => item.status === "below_min");
  const above = margins.filter((item) => item.status === "above_max");
  const belowDeviations = below.map((item) => Number(item.deviationCm || 0));
  const aboveDeviations = above.map((item) => Number(item.deviationCm || 0));
  return [
    countReportCodes(candidate, REPORT_MARKER_MISSING_CODES),
    countReportCodes(candidate, REPORT_MARKER_PAGINATION_CODES),
    hard.length,
    below.length,
    Math.max(...belowDeviations, 0),
    belowDeviations.reduce((sum, value) => sum + value, 0),
    above.length,
    Math.max(...aboveDeviations, 0),
    aboveDeviations.reduce((sum, value) => sum + value, 0),
  ];
};

const selectBestAvailableReport = (results) =>
  results.slice().sort((a, b) => {
    const A = reportBestEffortScore(a);
    const B = reportBestEffortScore(b);
    for (let index = 0; index < A.length; index++) {
      if (A[index] !== B[index]) return A[index] - B[index];
    }
    return 0;
  })[0];

const repairReportMarkerPagination = async ({ candidate, payload, artifacts }) => {
  if (!hasRepairableReportMarkerViolation(candidate)) return candidate;

  const repairDocxPath = candidate.docxPath.replace(
    /\.docx$/i,
    "_marker_repair.docx",
  );
  const repairPdfPath = buildPdfPath(repairDocxPath, buildPdfDir());
  artifacts.push(repairDocxPath, repairPdfPath);

  try {
    await cleanupFileIfExists(repairDocxPath);
    await cleanupFileIfExists(repairPdfPath);
    const source = await fs.readFile(candidate.docxPath);
    const repaired = forceMarkerBlockPageBreak(source, {
      markerText: "ПРОШУ:",
    });
    await fs.writeFile(repairDocxPath, repaired);
    await convertToPdf(repairDocxPath, buildPdfDir());

    const layout = await validateLayout(
      repairPdfPath,
      reportValidationContext(payload),
    );
    const repairedCandidate = {
      ...candidate,
      docxPath: repairDocxPath,
      pdfPath: repairPdfPath,
      pages: layout.pages,
      hardViolations: layout.hardViolations,
      marginViolations: layout.marginViolations,
      hasLayoutError: !layout.passed,
      layout,
      layoutFlags: layout.layoutFlags,
      systemicWhitespace: layout.systemicWhitespace,
      markerRepairApplied: true,
      markerRepairSucceeded: layout.layoutFlags?.proshuOk === true,
    };

    // Marker safety is the first comparison key, so a successful repair wins
    // even when the necessary page move increases the previous bottom gap.
    return selectBestAvailableReport([candidate, repairedCandidate]);
  } catch (error) {
    console.warn(
      `[runProfiles] ПРОШУ: marker repair failed profile=${candidate.profile}: ${error.message}`,
    );
    return {
      ...candidate,
      markerRepairApplied: false,
      markerRepairSucceeded: false,
      markerRepairError: error.message,
    };
  }
};

const runReportProfiles = async (report, job, documentConfig) => {
  const payload = buildPayload(report);
  const profiles = documentConfig.profiles || [];
  if (!profiles.length) throw new Error("No report profiles configured");

  const finalDocxPath = buildFinalDocxPath(job);
  const finalPdfPath = buildPdfPath(finalDocxPath, buildPdfDir());
  const artifacts = [];
  const safeCandidates = [];
  const generatedCandidates = [];
  const profileBatchSize = resolveProfileBatchSize();
  const context = reportValidationContext(payload);

  try {
    for (
      let batchStart = 0;
      batchStart < profiles.length;
      batchStart += profileBatchSize
    ) {
      const candidates = profiles
        .slice(batchStart, batchStart + profileBatchSize)
        .map((profile, offset) => ({
          profile,
          profileName: profile.name,
          docxPath: buildCandidateDocxPath(job, batchStart + offset),
        }));
      const batchResults = await evaluateReportCandidateBatch({
        payload,
        candidates,
        context,
      });

      for (const result of batchResults) artifacts.push(...result.artifacts);

      // Results are evaluated in the original manual profile order. Therefore
      // profile selection and every validation rule remain identical to v3.
      for (const result of batchResults) {
        if (!result.ok) continue;
        generatedCandidates.push(result);

        const hardOk = result.hardViolations.length === 0;
        const markerOk = result.layoutFlags?.proshuOk === true;
        const signatureOk = result.layoutFlags?.signatureOk === true;
        if (
          !hardOk ||
          !markerOk ||
          !signatureOk ||
          hasUnsafeBottom(result)
        ) {
          continue;
        }

        if (result.layout.passed) {
          return await promoteCandidate(
            { ...result, status: "passed", fallbackUsed: false },
            finalDocxPath,
            finalPdfPath,
          );
        }
        safeCandidates.push(result);
      }
    }

    const selected = selectClosestSafeReport(safeCandidates);
    if (selected) {
      return await promoteCandidate(
        { ...selected, status: "best_effort", fallbackUsed: false },
        finalDocxPath,
        finalPdfPath,
      );
    }

    const bestAvailable = selectBestAvailableReport(generatedCandidates);
    if (!bestAvailable) {
      throw new Error(
        "No report profile could be generated because every candidate failed technically",
      );
    }
    const repairedBestAvailable = await repairReportMarkerPagination({
      candidate: bestAvailable,
      payload,
      artifacts,
    });
    return await promoteCandidate(
      {
        ...repairedBestAvailable,
        status: "best_effort",
        fallbackUsed: false,
        bestEffortScore: reportBestEffortScore(repairedBestAvailable),
      },
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
