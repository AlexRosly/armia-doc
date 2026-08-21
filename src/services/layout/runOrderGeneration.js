const fs = require("fs/promises");
const path = require("path");

const { convertToPdf, convertManyToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
const forceMarkerBlockPageBreak = require("../word/forceMarkerBlockPageBreak");
const validateLayout = require("./validateLayout");
const documents = require("../documents");
const order = require("../documents/order");

const LOG_PREFIX = "[runOrderGeneration]";

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const docxDir = () => path.join(process.cwd(), "storage", "docx");
const pdfDir = () => path.join(process.cwd(), "storage", "pdf");
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
  result.layout?.hardViolations?.length === 0 &&
  !hasUnsafeBottom(result.layout) &&
  result.layoutFlags?.nakazuiuOk === true &&
  result.layoutFlags?.signatureOk === true;

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
  const repairPdfPath = buildPdfPath(repairDocxPath);
  artifacts.push(repairDocxPath, repairPdfPath);

  try {
    await cleanupFile(repairDocxPath);
    await cleanupFile(repairPdfPath);
    const source = await fs.readFile(candidate.docxPath);
    const repaired = forceMarkerBlockPageBreak(source, {
      markerText: "НАКАЗУЮ:",
    });
    await fs.writeFile(repairDocxPath, repaired);
    await convertToPdf(repairDocxPath, pdfDir());

    const layout = await validateLayout(
      repairPdfPath,
      buildOrderValidationContext(payload),
    );
    const repairedCandidate = {
      ...candidate,
      docxPath: repairDocxPath,
      pdfPath: repairPdfPath,
      pages: layout.pages,
      layout,
      layoutFlags: layout.layoutFlags,
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

const evaluateOrderCandidate = async ({ payload, job, profile, profileIndex }) => {
  const suffix = `order_candidate_${String(profileIndex + 1).padStart(4, "0")}`;
  const docxPath = buildDocxPath(job, suffix);
  const candidatePdfPath = buildPdfPath(docxPath);

  try {
    await cleanupFile(docxPath);
    await cleanupFile(candidatePdfPath);
    await order.generateOrderOnlyDocument(payload, docxPath, profile);

    // Normal candidates receive exactly one mutation pass. A second pass is
    // allowed only on a separate emergency marker-repair copy after PDF proof
    // of a НАКАЗУЮ: 0-1-line violation.
    await applyOrderPaginationFixesOnce(docxPath, profile, payload);
    await convertToPdf(docxPath, pdfDir());

    const layout = await validateLayout(
      candidatePdfPath,
      buildOrderValidationContext(payload),
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
      layoutFlags: layout.layoutFlags,
      artifacts: [docxPath, candidatePdfPath],
    };
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} order candidate failed profile=${profile.name}: ${error.message}`,
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

const evaluateOrderCandidateBatch = async ({
  payload,
  job,
  candidates,
  context,
}) => {
  if (candidates.length <= 1) {
    const results = [];
    for (const candidate of candidates) {
      results.push(
        await evaluateOrderCandidate({ ...candidate, payload, job }),
      );
    }
    return results;
  }

  try {
    const prepared = [];

    for (const candidate of candidates) {
      const suffix = `order_candidate_${String(
        candidate.profileIndex + 1,
      ).padStart(4, "0")}`;
      const docxPath = buildDocxPath(job, suffix);
      const pdfPath = buildPdfPath(docxPath);

      await cleanupFile(docxPath);
      await cleanupFile(pdfPath);
      await order.generateOrderOnlyDocument(
        payload,
        docxPath,
        candidate.profile,
      );
      await applyOrderPaginationFixesOnce(
        docxPath,
        candidate.profile,
        payload,
      );

      prepared.push({ ...candidate, docxPath, pdfPath });
    }

    await convertManyToPdf(
      prepared.map((candidate) => candidate.docxPath),
      pdfDir(),
    );

    const results = [];
    for (const candidate of prepared) {
      const layout = await validateLayout(candidate.pdfPath, context);
      results.push({
        ok: true,
        profile: candidate.profile,
        profileName: candidate.profile.name,
        profileIndex: candidate.profileIndex,
        docxPath: candidate.docxPath,
        pdfPath: candidate.pdfPath,
        pages: layout.pages,
        layout,
        layoutFlags: layout.layoutFlags,
        artifacts: [candidate.docxPath, candidate.pdfPath],
        conversionMode: "batch",
      });
    }
    return results;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} order batch failed; retrying one by one: ${error.message}`,
    );
    const results = [];
    for (const candidate of candidates) {
      results.push(
        await evaluateOrderCandidate({ ...candidate, payload, job }),
      );
    }
    return results;
  }
};

const selectOrderProfile = async ({ payload, job, profiles, artifacts }) => {
  const safeCandidates = [];
  const generatedCandidates = [];
  const profileBatchSize = resolveProfileBatchSize();
  const context = buildOrderValidationContext(payload);

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
    });

    for (const result of batchResults) artifacts.push(...result.artifacts);

    // Keep the original manual profile order and the same first-perfect rule.
    for (const result of batchResults) {
      if (result.ok) generatedCandidates.push(result);
      if (!isOrderSafe(result)) continue;
      if (result.layout.passed) {
        return { ...result, status: "passed", selectedVariant: "template" };
      }
      safeCandidates.push(result);
    }
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

const evaluateApprovalCandidate = async ({ payload, job, profile, profileIndex }) => {
  const suffix = `approval_candidate_${String(profileIndex + 1).padStart(3, "0")}`;
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
    if (!result.ok || result.pages.length !== 1 || hasUnsafeBottom(result.layout)) {
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
    },
    approval: {
      status: selectedApproval.status,
      profile: selectedApproval.profileName,
      pages: selectedApproval.pages,
    },
    finalOrder: {
      status: "assembled_from_independently_validated_sources",
      orderSourceRewrittenAfterValidation: false,
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
  fallbackUsed: false,
});

const runOrderGeneration = async (report, job) => {
  const documentConfig = documents.order;
  if (!documentConfig) throw new Error("Document config not found for type: order");

  await ensureStorageDirs();
  const payload = buildPayload(report);
  const { orderProfiles = [], approvalProfiles = [] } =
    documentConfig.profiles || {};
  if (!orderProfiles.length) throw new Error("No order profiles configured");
  if (!approvalProfiles.length) throw new Error("No approval profiles configured");

  const finalDocxPath = buildFinalDocxPath(job);
  const finalPdfPath = buildPdfPath(finalDocxPath);
  const artifacts = [];

  try {
    const selectedOrder = await selectOrderProfile({
      payload,
      job,
      profiles: orderProfiles,
      artifacts,
    });
    const selectedApproval = await selectApprovalProfile({
      payload,
      job,
      profiles: approvalProfiles,
      artifacts,
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
