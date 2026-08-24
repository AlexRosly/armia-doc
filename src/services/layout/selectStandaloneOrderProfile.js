const fs = require("fs/promises");
const path = require("path");

const { convertToPdf, convertManyToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const forceMarkerBlockPageBreak = require("../word/forceMarkerBlockPageBreak");
const validateLayout = require("./validateLayout");
const order = require("../documents/order");

const LOG_PREFIX = "[selectStandaloneOrderProfile]";

const docxDir = () => path.join(process.cwd(), "storage", "docx");
const pdfDir = () => path.join(process.cwd(), "storage", "pdf");
const buildCandidateDocxPath = (job, index) =>
  path.join(
    docxDir(),
    `${job._id}_order_candidate_${String(index + 1).padStart(4, "0")}.docx`,
  );
const buildPdfPath = (docxPath) =>
  path.join(pdfDir(), `${path.parse(docxPath).name}.pdf`);

const resolveProfileBatchSize = () => {
  const configured = Number(process.env.PROFILE_CONVERSION_BATCH_SIZE || 4);
  if (!Number.isFinite(configured)) return 4;
  return Math.max(1, Math.min(8, Math.floor(configured)));
};

const cleanupFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const prepareCandidate = async ({
  payload,
  job,
  profile,
  profileIndex,
}) => {
  const docxPath = buildCandidateDocxPath(job, profileIndex);
  const candidatePdfPath = buildPdfPath(docxPath);

  await cleanupFile(docxPath);
  await cleanupFile(candidatePdfPath);
  await order.generateOrderOnlyDocument(payload, docxPath, profile);

  const generated = await fs.readFile(docxPath);
  const paginated = applyDocumentPaginationFixes(generated, {
    documentType: "order",
    orderFormatting: profile?.orderFormatting,
    orderTitleText: payload?.data?.orderDetails?.orderTitle || "",
  });
  const prepared = order.prepareStandaloneOrderDocument({
    orderBuffer: paginated,
    printSettings:
      payload?.data?.printSettings || payload?.printSettings || {},
  });
  await fs.writeFile(docxPath, prepared.buffer);

  return {
    profile,
    profileName: profile.name,
    profileIndex,
    docxPath,
    pdfPath: candidatePdfPath,
    preparedPrintSettings: prepared.printSettings,
    preparedMeta: prepared.meta,
    artifacts: [docxPath, candidatePdfPath],
  };
};

const buildResult = (candidate, layout, conversionMode) => ({
  ok: true,
  ...candidate,
  pages: layout.pages,
  layout,
  layoutFlags: layout.layoutFlags,
  hardViolations: layout.hardViolations,
  marginViolations: layout.marginViolations,
  conversionMode,
});

const evaluateCandidate = async ({
  payload,
  job,
  profile,
  profileIndex,
  context,
}) => {
  const docxPath = buildCandidateDocxPath(job, profileIndex);
  const candidatePdfPath = buildPdfPath(docxPath);

  try {
    const candidate = await prepareCandidate({
      payload,
      job,
      profile,
      profileIndex,
    });
    await convertToPdf(candidate.docxPath, pdfDir());
    const layout = await validateLayout(candidate.pdfPath, context);
    return buildResult(candidate, layout, "single");
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} candidate failed profile=${profile.name}: ${error.message}`,
    );
    return {
      ok: false,
      profile,
      profileName: profile.name,
      profileIndex,
      docxPath,
      pdfPath: candidatePdfPath,
      error: error.message,
      artifacts: [docxPath, candidatePdfPath],
    };
  }
};

const evaluateBatch = async ({ payload, job, candidates, context }) => {
  if (candidates.length <= 1) {
    const results = [];
    for (const candidate of candidates) {
      results.push(
        await evaluateCandidate({
          ...candidate,
          payload,
          job,
          context,
        }),
      );
    }
    return results;
  }

  const prepared = [];
  try {
    for (const candidate of candidates) {
      prepared.push(
        await prepareCandidate({
          ...candidate,
          payload,
          job,
        }),
      );
    }

    await convertManyToPdf(
      prepared.map((candidate) => candidate.docxPath),
      pdfDir(),
    );

    const results = [];
    for (const candidate of prepared) {
      const layout = await validateLayout(candidate.pdfPath, context);
      results.push(buildResult(candidate, layout, "batch"));
    }
    return results;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} batch failed; retrying one by one: ${error.message}`,
    );
    const results = [];
    for (const candidate of candidates) {
      results.push(
        await evaluateCandidate({
          ...candidate,
          payload,
          job,
          context,
        }),
      );
    }
    return results;
  }
};

const hasUnsafeBottom = (candidate) =>
  (candidate.marginViolations || []).some(
    (item) => item.status === "below_min",
  );

const isProtocolSafe = (candidate) =>
  candidate.ok &&
  candidate.hardViolations.length === 0 &&
  candidate.layoutFlags?.nakazuiuOk === true &&
  candidate.layoutFlags?.signatureOk === true &&
  !hasUnsafeBottom(candidate);

const closestSafeScore = (candidate) => {
  const deviations = (candidate.marginViolations || []).map((item) =>
    Number(item.deviationCm || 0),
  );
  return [
    candidate.marginViolations.length,
    Math.max(...deviations, 0),
    deviations.reduce((sum, value) => sum + value, 0),
    candidate.profileIndex,
  ];
};

const compareTuple = (a, b) => {
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const delta = Number(a[index] || 0) - Number(b[index] || 0);
    if (delta) return delta;
  }
  return 0;
};

const selectClosestSafe = (candidates) =>
  candidates
    .slice()
    .sort((a, b) => compareTuple(closestSafeScore(a), closestSafeScore(b)))[0];

const markerMissingCodes = new Set(["NAKAZUIU_MISSING"]);
const markerPaginationCodes = new Set([
  "NAKAZUIU_LAST_LINE",
  "NAKAZUIU_NOT_ENOUGH_LINES_AFTER",
]);
const criticalCodes = new Set([
  "ORDER_SIGNATURE_NOT_FOUND",
  "ORDER_SIGNATURE_BLOCK_SPLIT",
  "ORDER_SIGNATURE_WITHOUT_CONTEXT",
  "EMPTY_LAST_PAGE",
]);

const countCodes = (candidate, codes) =>
  (candidate.hardViolations || []).filter((item) => codes.has(item.code))
    .length;

const bestAvailableScore = (candidate) => {
  const hard = candidate.hardViolations || [];
  const margins = candidate.marginViolations || [];
  const below = margins.filter((item) => item.status === "below_min");
  const above = margins.filter((item) => item.status === "above_max");
  const belowDeviation = below.map((item) => Number(item.deviationCm || 0));
  const aboveDeviation = above.map((item) => Number(item.deviationCm || 0));

  return [
    countCodes(candidate, markerMissingCodes),
    countCodes(candidate, markerPaginationCodes),
    hard.filter((item) => criticalCodes.has(item.code)).length,
    hard.length,
    below.length,
    Math.max(...belowDeviation, 0),
    belowDeviation.reduce((sum, value) => sum + value, 0),
    above.length,
    Math.max(...aboveDeviation, 0),
    aboveDeviation.reduce((sum, value) => sum + value, 0),
    candidate.profileIndex,
  ];
};

const selectBestAvailable = (candidates) =>
  candidates
    .slice()
    .sort((a, b) =>
      compareTuple(bestAvailableScore(a), bestAvailableScore(b)),
    )[0];

const repairNakazuiuPagination = async ({
  candidate,
  context,
  artifacts,
}) => {
  if (countCodes(candidate, markerPaginationCodes) === 0) return candidate;

  const docxPath = candidate.docxPath.replace(
    /\.docx$/i,
    "_nakazuiu_repair.docx",
  );
  const repairPdfPath = buildPdfPath(docxPath);
  artifacts.push(docxPath, repairPdfPath);

  try {
    await cleanupFile(docxPath);
    await cleanupFile(repairPdfPath);
    const source = await fs.readFile(candidate.docxPath);
    const repaired = forceMarkerBlockPageBreak(source, {
      markerText: "НАКАЗУЮ:",
    });
    await fs.writeFile(docxPath, repaired);
    await convertToPdf(docxPath, pdfDir());
    const layout = await validateLayout(repairPdfPath, context);
    const repairedCandidate = buildResult(
      {
        ...candidate,
        docxPath,
        pdfPath: repairPdfPath,
        artifacts: [docxPath, repairPdfPath],
      },
      layout,
      "repair",
    );
    repairedCandidate.markerRepairApplied = true;
    repairedCandidate.markerRepairSucceeded =
      layout.layoutFlags?.nakazuiuOk === true;
    return selectBestAvailable([candidate, repairedCandidate]);
  } catch (error) {
    console.warn(`${LOG_PREFIX} НАКАЗУЮ repair failed: ${error.message}`);
    return candidate;
  }
};

const selectStandaloneOrderProfile = async ({
  payload,
  job,
  profiles,
  context,
  artifacts,
}) => {
  const safeCandidates = [];
  const generatedCandidates = [];
  const batchSize = resolveProfileBatchSize();

  for (
    let batchStart = 0;
    batchStart < profiles.length;
    batchStart += batchSize
  ) {
    const candidates = profiles
      .slice(batchStart, batchStart + batchSize)
      .map((profile, offset) => ({
        profile,
        profileIndex: batchStart + offset,
      }));
    const batchResults = await evaluateBatch({
      payload,
      job,
      candidates,
      context,
    });

    for (const result of batchResults) {
      artifacts.push(...result.artifacts);
      if (!result.ok) continue;
      generatedCandidates.push(result);
      if (!isProtocolSafe(result)) continue;

      if (result.layout.passed) {
        return {
          ...result,
          status: "passed",
          selectedVariant: "standalone-order",
        };
      }
      safeCandidates.push(result);
    }
  }

  const closestSafe = selectClosestSafe(safeCandidates);
  if (closestSafe) {
    console.warn(
      `${LOG_PREFIX} exact profile not found; closest safe=${closestSafe.profileName}`,
    );
    return {
      ...closestSafe,
      status: "best_effort",
      selectedVariant: "standalone-order-best-effort",
    };
  }

  const bestAvailable = selectBestAvailable(generatedCandidates);
  if (!bestAvailable) {
    throw new Error(
      "No standalone order profile could be generated because every candidate failed technically",
    );
  }

  const repaired = await repairNakazuiuPagination({
    candidate: bestAvailable,
    context,
    artifacts,
  });
  console.warn(
    `${LOG_PREFIX} no protocol-safe profile; returning best available=${repaired.profileName}`,
  );
  return {
    ...repaired,
    status: "best_effort",
    selectedVariant: "standalone-order-best-available",
    bestEffortScore: bestAvailableScore(repaired),
  };
};

module.exports = selectStandaloneOrderProfile;
