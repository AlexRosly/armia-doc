const fs = require("fs/promises");
const path = require("path");
const { convertToPdf } = require("../pdf");
const validateLayout = require("./validateLayout");
const documents = require("../documents");
const order = require("../documents/order");

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildDocxPath = (job, suffix) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}_${suffix}.docx`);

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const ensureParentDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const evaluateCandidate = async ({
  payload,
  docxPath,
  pdfDir,
  profile,
  profileName,
  generateDocument,
  label,
}) => {
  try {
    await ensureParentDir(docxPath);
    await generateDocument(payload, docxPath, profile);
    await convertToPdf(docxPath, pdfDir);

    const pdfPath = buildPdfPath(docxPath, pdfDir);
    const pages = await validateLayout(pdfPath);
    const hasLayoutError = pages.some((page) => page.status === "below_min");

    return {
      ok: true,
      label,
      profileName,
      profile,
      pages,
      hasLayoutError,
    };
  } catch (error) {
    console.error(
      `[runOrderGeneration] ${label} candidate failed: ${profileName}`,
    );
    console.error(error.message);

    return {
      ok: false,
      label,
      profileName,
      profile,
      pages: [],
      hasLayoutError: true,
      error: error.message,
    };
  }
};

const runSingleSelection = async ({
  payload,
  job,
  profiles,
  label,
  generateDocument,
}) => {
  if (!profiles.length) {
    throw new Error(`No ${label} profiles configured`);
  }

  const docxPath = buildDocxPath(job, label);
  const pdfDir = buildPdfDir();

  console.log(
    `[runOrderGeneration] selecting ${label} profile, candidates=${profiles.length}`,
  );

  let bestResult = null;

  for (const profile of profiles) {
    const result = await evaluateCandidate({
      payload,
      docxPath,
      pdfDir,
      profile,
      profileName: profile.name,
      generateDocument,
      label,
    });

    if (!result.ok) {
      continue;
    }

    if (!result.hasLayoutError) {
      console.log(
        `[runOrderGeneration] ${label} passed with profile=${result.profileName}`,
      );

      return {
        status: "passed",
        profileName: result.profileName,
        profile: result.profile,
        pages: result.pages,
      };
    }

    bestResult = {
      status: "best_effort",
      profileName: result.profileName,
      profile: result.profile,
      pages: result.pages,
    };
  }

  if (bestResult) {
    console.warn(
      `[runOrderGeneration] ${label} fallback to best_effort profile=${bestResult.profileName}`,
    );
    return bestResult;
  }

  throw new Error(`No valid ${label} profile could be generated`);
};

const runOrderGeneration = async (report, job) => {
  const documentConfig = documents.order;

  if (!documentConfig) {
    throw new Error("Document config not found for type: order");
  }

  const payload = buildPayload(report);
  const { orderProfiles = [], approvalProfiles = [] } =
    documentConfig.profiles || {};

  const orderResult = await runSingleSelection({
    payload,
    job,
    profiles: orderProfiles,
    label: "order",
    generateDocument: order.generateOrderOnlyDocument,
  });

  const approvalResult = await runSingleSelection({
    payload,
    job,
    profiles: approvalProfiles,
    label: "approval",
    generateDocument: order.generateApprovalOnlyDocument,
  });

  const finalProfile = {
    orderProfile: orderResult.profile,
    approvalProfile: approvalResult.profile,
  };

  const finalDocxPath = path.join(
    process.cwd(),
    "storage",
    "docx",
    `${job._id}.docx`,
  );

  await ensureParentDir(finalDocxPath);

  console.log(
    `[runOrderGeneration] building final merged document with order=${orderResult.profileName}, approval=${approvalResult.profileName}`,
  );

  await order.generateOrderDocument(payload, finalDocxPath, finalProfile);

  return {
    status: "passed",
    profile: {
      orderProfile: orderResult.profileName,
      approvalProfile: approvalResult.profileName,
    },
    layoutCheck: {
      order: {
        status: orderResult.status,
        profile: orderResult.profileName,
        pages: orderResult.pages,
      },
      approval: {
        status: approvalResult.status,
        profile: approvalResult.profileName,
        pages: approvalResult.pages,
      },
    },
    resolvedProfile: finalProfile,
    outputPath: finalDocxPath,
  };
};

module.exports = runOrderGeneration;
