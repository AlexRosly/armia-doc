const generationStorageRoot = require("../generation/storageRoot");
const fs = require("fs/promises");
const path = require("path");

const { convertToPdf, convertManyToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const forceMarkerBlockPageBreak = require("../word/forceMarkerBlockPageBreak");
const validateLayout = require("./validateLayout");
const splitFinalOrderCandidatePdf = require("./splitFinalOrderCandidatePdf");
const documents = require("../documents");
const order = require("../documents/order");

const LOG_PREFIX = "[runOrderGeneration]";
const ORDER_BOTTOM_MIN_CM = 1.9;
const ORDER_BOTTOM_MAX_CM = 2.1;
const DEFAULT_WORD_SAFE_BOTTOM_FLOOR_CM = 2.05;
const DEFAULT_WORD_SAFE_BOTTOM_TARGET_CM = 2.08;
const DEFAULT_WORD_SAFE_EXTRA_PROFILE_COUNT = 32;

// A/B profile forcing was diagnostic only. It must never narrow production
// generation to a single candidate, including when PM2 keeps a stale env var.
const resolveForcedOrderProfileName = () => "";
const resolveOrderProfilesForRun = (profiles) => profiles;

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const docxDir = () => path.join(generationStorageRoot(), "docx");
const pdfDir = () => path.join(generationStorageRoot(), "pdf");
const buildDocxPath = (job, suffix) =>
  path.join(docxDir(), `${job._id}_${suffix}.docx`);
const buildPdfPath = (docxPath) =>
  path.join(pdfDir(), `${path.parse(docxPath).name}.pdf`);
const buildFinalDocxPath = (job) => buildDocxPath(job, "nakaz");

const resolveProfileBatchSize = () => {
  const configured = Number(process.env.PROFILE_CONVERSION_BATCH_SIZE || 4);
  if (!Number.isFinite(configured)) return 4;
  return Math.max(1, Math.min(8, Math.floor(configured)));
};

const ensureStorageDirs = async () => {
  await Promise.all([
    fs.mkdir(docxDir(), { recursive: true }),
    fs.mkdir(pdfDir(), { recursive: true }),
  ]);
};

const cleanupFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`${LOG_PREFIX} cleanup failed file=${filePath}`);
      console.warn(error.message);
    }
  }
};

const cleanupArtifacts = async (artifacts) => {
  for (const filePath of [...new Set(artifacts.filter(Boolean))]) {
    await cleanupFile(filePath);
  }
};

const buildOrderValidationContext = (payload) => {
  const signer = payload.data?.signer || {};
  return {
    documentType: "order",
    expectedBottomMarginCm: 2.0,
    minAllowedBottomMarginCm: 1.9,
    maxAllowedBottomMarginCm: 2.1,
    systemicWhitespaceThresholdCm: 2.1,
    systemicWhitespaceMinShare: 0.5,
    markers: {
      nakazuiu: "НАКАЗУЮ:",
      signerPosition: signer.position,
      signerRank: signer.rank,
      signerFirstName: signer.firstName,
      signerLastName: signer.lastName,
      signerFullName: signer.fullName,
    },
  };
};

const buildApprovalValidationContext = () => ({
  documentType: "approval",
  expectedBottomMarginCm: 2.0,
  minAllowedBottomMarginCm: 1.9,
  maxAllowedBottomMarginCm: 3.2,
  systemicWhitespaceThresholdCm: 2.2,
  systemicWhitespaceMinShare: 0.5,
  markers: {},
});

const hasUnsafeBottom = (layout) =>
  (layout?.marginViolations || []).some(
    (violation) => violation.status === "below_min",
  );

const isOrderSafe = (result) =>
  result.ok &&
  result.finalApproval?.ok === true &&
  result.layout?.hardViolations?.length === 0 &&
  !hasUnsafeBottom(result.layout) &&
  result.layoutFlags?.nakazuiuOk === true &&
  result.layoutFlags?.signatureOk === true;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveNumberFromEnv = (name, fallback) => {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) ? configured : fallback;
};

const resolveWordSafeBottomFloorCm = () =>
  clamp(
    resolveNumberFromEnv(
      "ORDER_WORD_SAFE_BOTTOM_FLOOR_CM",
      DEFAULT_WORD_SAFE_BOTTOM_FLOOR_CM,
    ),
    ORDER_BOTTOM_MIN_CM,
    ORDER_BOTTOM_MAX_CM,
  );

const resolveWordSafeBottomTargetCm = () => {
  const floor = resolveWordSafeBottomFloorCm();
  return clamp(
    resolveNumberFromEnv(
      "ORDER_WORD_SAFE_BOTTOM_TARGET_CM",
      DEFAULT_WORD_SAFE_BOTTOM_TARGET_CM,
    ),
    floor,
    ORDER_BOTTOM_MAX_CM,
  );
};

const resolveWordSafeExtraProfileCount = () => {
  const configured = resolveNumberFromEnv(
    "ORDER_WORD_SAFE_EXTRA_PROFILES",
    DEFAULT_WORD_SAFE_EXTRA_PROFILE_COUNT,
  );
  return Math.max(0, Math.min(96, Math.floor(configured)));
};

const getNonLastOrderBottomGaps = (result) =>
  (result?.layout?.pages || [])
    .filter(
      (page) =>
        page?.isLastPage === false &&
        Array.isArray(page.lines) &&
        page.lines.some((line) => String(line?.text || "").trim()),
    )
    .map((page) => Number(page.actualBottomTextGapCm))
    .filter(Number.isFinite);

const wordCompatibilityScore = (result) => {
  const floorCm = resolveWordSafeBottomFloorCm();
  const targetCm = resolveWordSafeBottomTargetCm();
  const gaps = getNonLastOrderBottomGaps(result);
  const deficits = gaps.map((gap) => Math.max(0, floorCm - gap));
  const targetDeviations = gaps.map((gap) => Math.abs(targetCm - gap));

  return {
    finalApprovalInvalidCount: result.finalApproval?.ok === true ? 0 : 1,
    floorCm,
    targetCm,
    riskyPageCount: deficits.filter((value) => value > 0).length,
    maxClearanceDeficitCm: Math.max(...deficits, 0),
    totalClearanceDeficitCm: deficits.reduce((sum, value) => sum + value, 0),
    maxTargetDeviationCm: Math.max(...targetDeviations, 0),
    totalTargetDeviationCm: targetDeviations.reduce(
      (sum, value) => sum + value,
      0,
    ),
    gapsCm: gaps,
    profileIndex: result.profileIndex,
  };
};

const compareWordCompatibility = (a, b) => {
  const A = wordCompatibilityScore(a);
  const B = wordCompatibilityScore(b);
  return (
    A.finalApprovalInvalidCount - B.finalApprovalInvalidCount ||
    A.riskyPageCount - B.riskyPageCount ||
    A.maxClearanceDeficitCm - B.maxClearanceDeficitCm ||
    A.totalClearanceDeficitCm - B.totalClearanceDeficitCm ||
    A.maxTargetDeviationCm - B.maxTargetDeviationCm ||
    A.totalTargetDeviationCm - B.totalTargetDeviationCm ||
    A.profileIndex - B.profileIndex
  );
};

const isWordCompatibleExactCandidate = (result) =>
  isOrderSafe(result) &&
  result.layout?.passed === true &&
  wordCompatibilityScore(result).riskyPageCount === 0;

const candidateDistance = (result) => {
  const margins = result.layout?.marginViolations || [];
  const deviations = margins.map((item) => Number(item.deviationCm || 0));
  return {
    violationCount: margins.length,
    maxDeviation: deviations.length ? Math.max(...deviations) : 0,
    totalDeviation: deviations.reduce((sum, value) => sum + value, 0),
    profileIndex: result.profileIndex,
  };
};

const compareDistance = (a, b) => {
  const da = candidateDistance(a);
  const db = candidateDistance(b);
  return (
    da.violationCount - db.violationCount ||
    da.maxDeviation - db.maxDeviation ||
    da.totalDeviation - db.totalDeviation ||
    da.profileIndex - db.profileIndex
  );
};

const ORDER_MARKER_MISSING_CODES = new Set(["NAKAZUIU_MISSING"]);
const ORDER_MARKER_PAGINATION_CODES = new Set([
  "NAKAZUIU_LAST_LINE",
  "NAKAZUIU_NOT_ENOUGH_LINES_AFTER",
]);
const CRITICAL_ORDER_CODES = new Set([
  "ORDER_SIGNATURE_NOT_FOUND",
  "ORDER_SIGNATURE_BLOCK_SPLIT",
  "ORDER_SIGNATURE_WITHOUT_CONTEXT",
  "EMPTY_LAST_PAGE",
]);

const countOrderCodes = (result, codes) =>
  (result.layout?.hardViolations || []).filter((item) => codes.has(item.code))
    .length;

const hasRepairableOrderMarkerViolation = (result) =>
  countOrderCodes(result, ORDER_MARKER_PAGINATION_CODES) > 0;

const bestEffortScore = (result) => {
  const hard = result.layout?.hardViolations || [];
  const margins = result.layout?.marginViolations || [];
  const below = margins.filter((item) => item.status === "below_min");
  const above = margins.filter((item) => item.status === "above_max");
  const belowDeviations = below.map((item) => Number(item.deviationCm || 0));
  const aboveDeviations = above.map((item) => Number(item.deviationCm || 0));

  return {
    finalApprovalInvalidCount: result.finalApproval?.ok === true ? 0 : 1,
    markerMissingCount: countOrderCodes(result, ORDER_MARKER_MISSING_CODES),
    markerPaginationCount: countOrderCodes(
      result,
      ORDER_MARKER_PAGINATION_CODES,
    ),
    criticalHardCount: hard.filter((item) =>
      CRITICAL_ORDER_CODES.has(item.code),
    ).length,
    totalHardCount: hard.length,
    belowMinPageCount: below.length,
    maxBelowMinDeviation: Math.max(...belowDeviations, 0),
    totalBelowMinDeviation: belowDeviations.reduce(
      (sum, value) => sum + value,
      0,
    ),
    aboveMaxPageCount: above.length,
    maxAboveMaxDeviation: Math.max(...aboveDeviations, 0),
    totalAboveMaxDeviation: aboveDeviations.reduce(
      (sum, value) => sum + value,
      0,
    ),
    profileIndex: result.profileIndex,
  };
};

const compareBestEffort = (a, b) => {
  const A = bestEffortScore(a);
  const B = bestEffortScore(b);
  return (
    A.finalApprovalInvalidCount - B.finalApprovalInvalidCount ||
    A.markerMissingCount - B.markerMissingCount ||
    A.markerPaginationCount - B.markerPaginationCount ||
    A.criticalHardCount - B.criticalHardCount ||
    A.totalHardCount - B.totalHardCount ||
    A.belowMinPageCount - B.belowMinPageCount ||
    A.maxBelowMinDeviation - B.maxBelowMinDeviation ||
    A.totalBelowMinDeviation - B.totalBelowMinDeviation ||
    A.aboveMaxPageCount - B.aboveMaxPageCount ||
    A.maxAboveMaxDeviation - B.maxAboveMaxDeviation ||
    A.totalAboveMaxDeviation - B.totalAboveMaxDeviation ||
    A.profileIndex - B.profileIndex
  );
};

const buildSplitPdfPath = (mergedPdfPath, part) =>
  mergedPdfPath.replace(/\.pdf$/i, `_${part}.pdf`);

const buildOrderCandidatePaths = (job, profileIndex) => {
  const number = String(profileIndex + 1).padStart(4, "0");
  const sourceDocxPath = buildDocxPath(job, `order_candidate_${number}`);
  const finalDocxPath = buildDocxPath(job, `order_final_candidate_${number}`);
  const mergedPdfPath = buildPdfPath(finalDocxPath);
  return {
    sourceDocxPath,
    finalDocxPath,
    mergedPdfPath,
    orderPdfPath: buildSplitPdfPath(mergedPdfPath, "order"),
    approvalPdfPath: buildSplitPdfPath(mergedPdfPath, "approval"),
  };
};

const candidateArtifactPaths = (paths) => [
  paths.sourceDocxPath,
  paths.finalDocxPath,
  paths.mergedPdfPath,
  paths.orderPdfPath,
  paths.approvalPdfPath,
];

const validatePreparedOrderCandidate = async ({
  preparedCandidate,
  context,
  expectedApprovalPageCount = 1,
}) => {
  const split = await splitFinalOrderCandidatePdf({
    mergedPdfPath: preparedCandidate.mergedPdfPath,
    orderPdfPath: preparedCandidate.orderPdfPath,
    approvalPdfPath: preparedCandidate.approvalPdfPath,
    expectedApprovalPageCount,
  });
  const [layout, approvalLayout] = await Promise.all([
    validateLayout(preparedCandidate.orderPdfPath, context),
    validateLayout(
      preparedCandidate.approvalPdfPath,
      buildApprovalValidationContext(),
    ),
  ]);
  const finalApprovalOk =
    approvalLayout.pages.length === expectedApprovalPageCount &&
    approvalLayout.hardViolations.length === 0 &&
    !hasUnsafeBottom(approvalLayout);

  return {
    ok: true,
    profile: preparedCandidate.profile,
    profileName: preparedCandidate.profile.name,
    profileIndex: preparedCandidate.profileIndex,
    sourceDocxPath: preparedCandidate.sourceDocxPath,
    docxPath: preparedCandidate.finalDocxPath,
    pdfPath: preparedCandidate.orderPdfPath,
    mergedPdfPath: preparedCandidate.mergedPdfPath,
    approvalPdfPath: preparedCandidate.approvalPdfPath,
    pages: layout.pages,
    layout,
    layoutFlags: layout.layoutFlags,
    finalApproval: {
      ok: finalApprovalOk,
      pdfPath: preparedCandidate.approvalPdfPath,
      pages: approvalLayout.pages,
      layout: approvalLayout,
    },
    finalSplit: split,
    preparedPrintSettings: preparedCandidate.prepared.printSettings,
    preparedMeta: preparedCandidate.prepared.meta,
    artifacts: candidateArtifactPaths(preparedCandidate),
  };
};

const prepareExactFinalOrderCandidate = async ({
  payload,
  job,
  profile,
  profileIndex,
  approvalBuffer,
}) => {
  const paths = buildOrderCandidatePaths(job, profileIndex);
  await cleanupArtifacts(candidateArtifactPaths(paths));
  await order.generateOrderOnlyDocument(payload, paths.sourceDocxPath, profile);

  // Pagination is fixed before the final merge. The result of the merge and
  // Word-compatibility pass below is the exact DOCX that will be returned.
  await applyOrderPaginationFixesOnce(paths.sourceDocxPath, profile, payload);
  const orderBuffer = await fs.readFile(paths.sourceDocxPath);
  const prepared = await order.prepareOrderPrintDocument({
    orderBuffer,
    approvalBuffer,
    printSettings: payload?.printSettings,
  });
  await fs.writeFile(paths.finalDocxPath, prepared.buffer);

  return { ...paths, profile, profileIndex, prepared };
};

const repairOrderMarkerPagination = async ({
  candidate,
  payload,
  artifacts,
}) => {
  if (!hasRepairableOrderMarkerViolation(candidate)) return candidate;

  const repairDocxPath = candidate.docxPath.replace(
    /\.docx$/i,
    "_marker_repair.docx",
  );
  const repairMergedPdfPath = buildPdfPath(repairDocxPath);
  const repairOrderPdfPath = buildSplitPdfPath(repairMergedPdfPath, "order");
  const repairApprovalPdfPath = buildSplitPdfPath(
    repairMergedPdfPath,
    "approval",
  );
  artifacts.push(
    repairDocxPath,
    repairMergedPdfPath,
    repairOrderPdfPath,
    repairApprovalPdfPath,
  );

  try {
    await cleanupFile(repairDocxPath);
    await cleanupArtifacts([
      repairMergedPdfPath,
      repairOrderPdfPath,
      repairApprovalPdfPath,
    ]);
    const source = await fs.readFile(candidate.docxPath);
    const repaired = forceMarkerBlockPageBreak(source, {
      markerText: "НАКАЗУЮ:",
    });
    await fs.writeFile(repairDocxPath, repaired);
    await convertToPdf(repairDocxPath, pdfDir());

    const split = await splitFinalOrderCandidatePdf({
      mergedPdfPath: repairMergedPdfPath,
      orderPdfPath: repairOrderPdfPath,
      approvalPdfPath: repairApprovalPdfPath,
      expectedApprovalPageCount: 1,
    });
    const [layout, approvalLayout] = await Promise.all([
      validateLayout(repairOrderPdfPath, buildOrderValidationContext(payload)),
      validateLayout(repairApprovalPdfPath, buildApprovalValidationContext()),
    ]);
    const finalApprovalOk =
      approvalLayout.pages.length === 1 &&
      approvalLayout.hardViolations.length === 0 &&
      !hasUnsafeBottom(approvalLayout);

    const repairedCandidate = {
      ...candidate,
      docxPath: repairDocxPath,
      pdfPath: repairOrderPdfPath,
      mergedPdfPath: repairMergedPdfPath,
      approvalPdfPath: repairApprovalPdfPath,
      pages: layout.pages,
      layout,
      layoutFlags: layout.layoutFlags,
      finalApproval: {
        ok: finalApprovalOk,
        pdfPath: repairApprovalPdfPath,
        pages: approvalLayout.pages,
        layout: approvalLayout,
      },
      finalSplit: split,
      markerRepairApplied: true,
      markerRepairSucceeded: layout.layoutFlags?.nakazuiuOk === true,
    };

    return [candidate, repairedCandidate].sort(compareBestEffort)[0];
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} НАКАЗУЮ: marker repair failed profile=${candidate.profileName}: ${error.message}`,
    );
    return {
      ...candidate,
      markerRepairApplied: false,
      markerRepairSucceeded: false,
      markerRepairError: error.message,
    };
  }
};

const applyOrderPaginationFixesOnce = async (docxPath, profile, payload) => {
  const source = await fs.readFile(docxPath);
  const fixed = applyDocumentPaginationFixes(source, {
    documentType: "order",
    orderFormatting: profile?.orderFormatting,
    orderTitleText: payload?.data?.orderDetails?.orderTitle || "",
  });
  await fs.writeFile(docxPath, fixed);
};

const evaluateOrderCandidate = async ({
  payload,
  job,
  profile,
  profileIndex,
  approvalBuffer,
  expectedApprovalPageCount = 1,
}) => {
  const paths = buildOrderCandidatePaths(job, profileIndex);

  try {
    const preparedCandidate = await prepareExactFinalOrderCandidate({
      payload,
      job,
      profile,
      profileIndex,
      approvalBuffer,
    });
    await convertToPdf(preparedCandidate.finalDocxPath, pdfDir());
    const result = await validatePreparedOrderCandidate({
      preparedCandidate,
      context: buildOrderValidationContext(payload),
      expectedApprovalPageCount,
    });
    return { ...result, conversionMode: "single" };
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} order candidate failed profile=${profile.name}: ${error.message}`,
    );
    return {
      ok: false,
      profile,
      profileName: profile.name,
      profileIndex,
      sourceDocxPath: paths.sourceDocxPath,
      docxPath: paths.finalDocxPath,
      pdfPath: paths.orderPdfPath,
      mergedPdfPath: paths.mergedPdfPath,
      approvalPdfPath: paths.approvalPdfPath,
      error: error.message,
      artifacts: candidateArtifactPaths(paths),
    };
  }
};

const evaluateOrderCandidateBatch = async ({
  payload,
  job,
  candidates,
  context,
  approvalBuffer,
  expectedApprovalPageCount = 1,
}) => {
  if (candidates.length <= 1) {
    const results = [];
    for (const candidate of candidates) {
      results.push(
        await evaluateOrderCandidate({
          ...candidate,
          payload,
          job,
          approvalBuffer,
          expectedApprovalPageCount,
        }),
      );
    }
    return results;
  }

  const prepared = [];
  try {
    for (const candidate of candidates) {
      prepared.push(
        await prepareExactFinalOrderCandidate({
          payload,
          job,
          profile: candidate.profile,
          profileIndex: candidate.profileIndex,
          approvalBuffer,
        }),
      );
    }

    await convertManyToPdf(
      prepared.map((candidate) => candidate.finalDocxPath),
      pdfDir(),
    );

    const results = [];
    for (const candidate of prepared) {
      const result = await validatePreparedOrderCandidate({
        preparedCandidate: candidate,
        context,
        expectedApprovalPageCount,
      });
      results.push({ ...result, conversionMode: "batch" });
    }
    return results;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} order batch failed; retrying one by one: ${error.message}`,
    );
    await cleanupArtifacts(prepared.flatMap(candidateArtifactPaths));
    const results = [];
    for (const candidate of candidates) {
      results.push(
        await evaluateOrderCandidate({
          ...candidate,
          payload,
          job,
          approvalBuffer,
          expectedApprovalPageCount,
        }),
      );
    }
    return results;
  }
};

const selectOrderProfile = async ({
  payload,
  job,
  profiles,
  artifacts,
  approvalBuffer,
  expectedApprovalPageCount = 1,
}) => {
  const safeCandidates = [];
  const generatedCandidates = [];
  const passedCandidates = [];
  const profileBatchSize = resolveProfileBatchSize();
  const wordSafeExtraProfileCount = resolveWordSafeExtraProfileCount();
  const context = buildOrderValidationContext(payload);
  let firstPassedProfileIndex = null;

  for (
    let batchStart = 0;
    batchStart < profiles.length;
    batchStart += profileBatchSize
  ) {
    const candidates = profiles
      .slice(batchStart, batchStart + profileBatchSize)
      .map((profile, offset) => ({
        profile,
        profileIndex: batchStart + offset,
      }));
    const batchResults = await evaluateOrderCandidateBatch({
      payload,
      job,
      candidates,
      context,
      approvalBuffer,
      expectedApprovalPageCount,
    });

    for (const result of batchResults) artifacts.push(...result.artifacts);

    const wordCompatibleBatchCandidates = [];

    for (const result of batchResults) {
      if (result.ok) generatedCandidates.push(result);
      if (!isOrderSafe(result)) continue;
      if (result.layout.passed) {
        passedCandidates.push(result);
        if (firstPassedProfileIndex == null) {
          firstPassedProfileIndex = result.profileIndex;
        }
        if (isWordCompatibleExactCandidate(result)) {
          wordCompatibleBatchCandidates.push(result);
        }
        continue;
      }
      safeCandidates.push(result);
    }

    if (wordCompatibleBatchCandidates.length) {
      wordCompatibleBatchCandidates.sort(compareWordCompatibility);
      const selected = wordCompatibleBatchCandidates[0];
      return {
        ...selected,
        status: "passed",
        selectedVariant: "template",
        wordCompatibility: wordCompatibilityScore(selected),
      };
    }

    if (
      firstPassedProfileIndex != null &&
      batchStart + candidates.length >=
        firstPassedProfileIndex + 1 + wordSafeExtraProfileCount
    ) {
      break;
    }
  }

  passedCandidates.sort(compareWordCompatibility);
  const bestPassedCandidate = passedCandidates[0];
  if (bestPassedCandidate) {
    console.warn(
      `${LOG_PREFIX} exact PDF profile found without full Word clearance; ` +
        `profile=${bestPassedCandidate.profileName} ` +
        `wordScore=${JSON.stringify(wordCompatibilityScore(bestPassedCandidate))}`,
    );
    return {
      ...bestPassedCandidate,
      status: "passed",
      selectedVariant: "template",
      wordCompatibility: wordCompatibilityScore(bestPassedCandidate),
    };
  }

  safeCandidates.sort(compareDistance);
  const closest = safeCandidates[0];
  if (closest) {
    console.warn(
      `${LOG_PREFIX} exact order profile not found; closest safe profile=${closest.profileName}`,
    );
    return { ...closest, status: "best_effort", selectedVariant: "template" };
  }

  generatedCandidates.sort(compareBestEffort);
  const bestAvailable = generatedCandidates[0];
  if (!bestAvailable) {
    throw new Error(
      "No order profile could be generated because every candidate failed technically",
    );
  }

  const repairedBestAvailable = await repairOrderMarkerPagination({
    candidate: bestAvailable,
    payload,
    artifacts,
  });
  console.warn(
    `${LOG_PREFIX} no fully safe order profile; returning best available profile=${repairedBestAvailable.profileName} score=${JSON.stringify(bestEffortScore(repairedBestAvailable))}`,
  );
  return {
    ...repairedBestAvailable,
    status: "best_effort",
    selectedVariant: repairedBestAvailable.markerRepairApplied
      ? "template-best-available-marker-repaired"
      : "template-best-available",
    bestEffortScore: bestEffortScore(repairedBestAvailable),
  };
};

const evaluateApprovalCandidate = async ({
  payload,
  job,
  profile,
  profileIndex,
}) => {
  const suffix = `approval_candidate_${String(profileIndex + 1).padStart(
    3,
    "0",
  )}`;
  const docxPath = buildDocxPath(job, suffix);
  const candidatePdfPath = buildPdfPath(docxPath);

  try {
    await cleanupFile(docxPath);
    await cleanupFile(candidatePdfPath);
    await order.generateApprovalOnlyDocument(payload, docxPath, profile);
    await convertToPdf(docxPath, pdfDir());
    const layout = await validateLayout(
      candidatePdfPath,
      buildApprovalValidationContext(),
    );
    return {
      ok: true,
      profile,
      profileName: profile.name,
      profileIndex,
      docxPath,
      pdfPath: candidatePdfPath,
      pages: layout.pages,
      layout,
      artifacts: [docxPath, candidatePdfPath],
    };
  } catch (error) {
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

const selectApprovalProfile = async ({ payload, job, profiles, artifacts }) => {
  const onePageCandidates = [];

  for (let profileIndex = 0; profileIndex < profiles.length; profileIndex++) {
    const result = await evaluateApprovalCandidate({
      payload,
      job,
      profile: profiles[profileIndex],
      profileIndex,
    });
    artifacts.push(...result.artifacts);
    if (
      !result.ok ||
      result.pages.length !== 1 ||
      hasUnsafeBottom(result.layout)
    ) {
      continue;
    }
    if (result.layout.passed) return { ...result, status: "passed" };
    onePageCandidates.push(result);
  }

  onePageCandidates.sort(compareDistance);
  if (!onePageCandidates.length) {
    throw new Error("No valid one-page approval profile could be generated");
  }
  return { ...onePageCandidates[0], status: "best_effort" };
};

const buildFinalResult = ({
  finalDocxPath,
  finalPdfPath,
  selectedOrder,
  selectedApproval,
  finalProfile,
  generationArtifact,
}) => ({
  status:
    selectedOrder.status === "passed" && selectedApproval.status === "passed"
      ? "passed"
      : "best_effort",
  profile: {
    orderProfile: selectedOrder.profileName,
    approvalProfile: selectedApproval.profileName,
  },
  layoutCheck: {
    order: {
      status: selectedOrder.status,
      profile: selectedOrder.profileName,
      variant: selectedOrder.selectedVariant,
      pages: selectedOrder.pages,
      layoutFlags: selectedOrder.layoutFlags,
      hardViolations: selectedOrder.layout.hardViolations,
      marginViolations: selectedOrder.layout.marginViolations,
      bottomMetric: selectedOrder.layout.bottomMetric,
      bestEffortScore: selectedOrder.bestEffortScore || null,
      markerRepairApplied: selectedOrder.markerRepairApplied || false,
      markerRepairSucceeded: selectedOrder.markerRepairSucceeded ?? null,
      wordCompatibility:
        selectedOrder.wordCompatibility ||
        wordCompatibilityScore(selectedOrder),
    },
    approval: {
      status:
        selectedOrder.finalApproval?.ok === true
          ? selectedApproval.status
          : "best_effort",
      profile: selectedApproval.profileName,
      pages: selectedOrder.finalApproval?.pages || selectedApproval.pages,
      exactFinalOk: selectedOrder.finalApproval?.ok ?? null,
      hardViolations: selectedOrder.finalApproval?.layout?.hardViolations || [],
      marginViolations:
        selectedOrder.finalApproval?.layout?.marginViolations || [],
    },
    finalOrder: {
      status:
        selectedOrder.status === "passed"
          ? "exact_final_docx_passed"
          : "exact_final_docx_best_effort",
      orderSourceRewrittenAfterValidation: false,
      validationMode: "render_split_validate_promote_same_bytes",
      split: selectedOrder.finalSplit || null,
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
    finalValidationMode: generationArtifact?.finalValidationMode || null,
  },
  fallbackUsed: false,
});

const runOrderGeneration = async (report, job) => {
  const documentConfig = documents.order;
  if (!documentConfig)
    throw new Error("Document config not found for type: order");

  await ensureStorageDirs();
  const payload = buildPayload(report);
  const { orderProfiles = [], approvalProfiles = [] } =
    documentConfig.profiles || {};
  if (!orderProfiles.length) throw new Error("No order profiles configured");
  if (!approvalProfiles.length)
    throw new Error("No approval profiles configured");

  const finalDocxPath = buildFinalDocxPath(job);
  const finalPdfPath = buildPdfPath(finalDocxPath);
  const artifacts = [];

  try {
    const selectedApproval = await selectApprovalProfile({
      payload,
      job,
      profiles: approvalProfiles,
      artifacts,
    });
    const effectiveOrderProfiles = resolveOrderProfilesForRun(orderProfiles);
    const approvalBuffer = await fs.readFile(selectedApproval.docxPath);

    const selectedOrder = await selectOrderProfile({
      payload,
      job,
      // profiles: orderProfiles,
      profiles: effectiveOrderProfiles,
      artifacts,
      approvalBuffer,
      expectedApprovalPageCount: selectedApproval.pages.length,
    });

    console.log(`${LOG_PREFIX} selected order candidate after full search:`, {
      profileName: selectedOrder.profileName,
      evaluatedProfilePoolSize: effectiveOrderProfiles.length,
      removeDocGrid:
        selectedOrder.preparedMeta?.wordCompatibility?.removeDocGrid ?? null,
      removedDocGridCount:
        selectedOrder.preparedMeta?.wordCompatibility?.removedDocGridCount ??
        null,
    });

    const finalProfile = {
      orderProfile: selectedOrder.profile,
      approvalProfile: selectedApproval.profile,
    };

    await cleanupFile(finalDocxPath);
    await cleanupFile(finalPdfPath);

    const generationArtifact = await order.generateOrderDocument({
      payload,
      outputPath: finalDocxPath,
      profile: finalProfile,
      orderSource: {
        docxPath: selectedOrder.docxPath,
        pdfPath: selectedOrder.pdfPath,
        pageCount: selectedOrder.pages.length,
      },
      approvalSource: {
        docxPath: selectedApproval.docxPath,
        pdfPath: selectedApproval.pdfPath,
        pageCount: selectedApproval.pages.length,
      },
      preparedSource: {
        docxPath: selectedOrder.docxPath,
        orderPdfPath: selectedOrder.pdfPath,
        approvalPdfPath: selectedOrder.approvalPdfPath,
        orderPageCount: selectedOrder.pages.length,
        approvalPageCount:
          selectedOrder.finalApproval?.pages?.length ||
          selectedApproval.pages.length,
        printSettings: selectedOrder.preparedPrintSettings,
        meta: selectedOrder.preparedMeta,
        split: selectedOrder.finalSplit,
      },
    });

    return buildFinalResult({
      finalDocxPath,
      finalPdfPath: generationArtifact?.pdfPath || finalPdfPath,
      selectedOrder,
      selectedApproval,
      finalProfile,
      generationArtifact,
    });
  } finally {
    await cleanupArtifacts(artifacts);
  }
};

module.exports = runOrderGeneration;
