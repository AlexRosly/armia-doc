const fs = require("fs/promises");
const path = require("path");

const { convertToPdf } = require("../pdf");
const { applyDocumentPaginationFixes } = require("../word");
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

    // This is the only mutation pass. The selected candidate is used directly
    // for both the final Word merge and the duplex PDF assembly.
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

const selectOrderProfile = async ({ payload, job, profiles, artifacts }) => {
  const safeCandidates = [];

  for (let profileIndex = 0; profileIndex < profiles.length; profileIndex++) {
    const result = await evaluateOrderCandidate({
      payload,
      job,
      profile: profiles[profileIndex],
      profileIndex,
    });
    artifacts.push(...result.artifacts);

    if (!isOrderSafe(result)) continue;
    if (result.layout.passed) {
      return { ...result, status: "passed", selectedVariant: "template" };
    }
    safeCandidates.push(result);
  }

  safeCandidates.sort(compareDistance);
  const closest = safeCandidates[0];
  if (!closest) {
    throw new Error(
      "No safe order profile: every candidate violates a hard pagination rule or goes below 1.9 cm",
    );
  }

  console.warn(
    `${LOG_PREFIX} exact order profile not found; closest safe profile=${closest.profileName}`,
  );
  return { ...closest, status: "best_effort", selectedVariant: "template" };
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
      marginViolations: selectedOrder.layout.marginViolations,
      bottomMetric: selectedOrder.layout.bottomMetric,
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
