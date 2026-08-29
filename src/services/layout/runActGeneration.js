const fs = require("fs/promises");
const path = require("path");

const convertToPdf = require("../pdf/convertToPdf");
const validateActDocxGeometry = require("./validateActDocxGeometry");
const validateActLayout = require("./validateActLayout");

const {
  generateActDocument,
  resolveActLayoutProfile,
} = require("../documents/act");
const actProfiles = require("../documents/act/profiles");

const DEBUG_ACT_LAYOUT = process.env.ACT_LAYOUT_DEBUG === "1";
const PROFILE_INVARIANT_REPEAT_LIMIT = 8;
const lastSuccessfulProfileByLayout = new Map();

const PROFILE_INVARIANT_CODES = new Set([
  "ACT_EVENT_SECTION_MISSING",
  "ACT_COMMISSION_SECTION_MISSING",
  "ACT_SERVICE_TOTALS_MISSING",
  "ACT_GRAND_TOTAL_MISSING",
  "ACT_SIGNATURE_HEADING_MISSING",
  "ACT_COPIES_HEADING_MISSING",
  "ACT_COPIES_MISSING",
  "ACT_COMMANDER_SECTION_MISSING",
]);

const buildPayload = (report) => ({
  ...report.toObject(),
  documentType: report.documentType,
  templateType: report.templateType,
});

const buildPdfDir = () => path.join(process.cwd(), "storage", "pdf");

const buildFinalDocxPath = (job) =>
  path.join(process.cwd(), "storage", "docx", `${job._id}_act.docx`);

const buildFinalPdfPath = (job) =>
  path.join(process.cwd(), "storage", "pdf", `${job._id}_act.pdf`);

const buildCandidateDocxPath = (job, index) =>
  path.join(
    process.cwd(),
    "storage",
    "docx",
    `${job._id}__act_candidate_${String(index).padStart(4, "0")}.docx`,
  );

const buildPdfPath = (docxPath, pdfDir) =>
  path.join(pdfDir, `${path.parse(docxPath).name}.pdf`);

const buildActSearchProfiles = (profiles, layoutProfile) => {
  const ordered = [];
  const seen = new Set();
  const add = (profile) => {
    if (!profile || seen.has(profile.name)) return;
    seen.add(profile.name);
    ordered.push(profile);
  };

  const lastSuccessfulName = lastSuccessfulProfileByLayout.get(layoutProfile);
  if (lastSuccessfulName) {
    add(profiles.find((profile) => profile.name === lastSuccessfulName));
  }

  add(profiles[0]);

  // Probe the whole typography/spacing space before the exhaustive pass.
  // For 729 profiles this checks about 28 representatives first.
  const stride = Math.max(2, Math.floor(Math.sqrt(profiles.length)));
  for (let index = stride; index < profiles.length; index += stride) {
    add(profiles[index]);
  }
  add(profiles[profiles.length - 1]);

  profiles.forEach(add);
  return ordered;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureParentDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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

const normalizeCopiesCount = (value) => {
  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

const normalizePerson = (person = {}) => ({
  position: person.position || "",
  rank: person.rank || "",
  firstName: person.firstName || "",
  lastName: person.lastName || "",
  fullName: [person.firstName, person.lastName].filter(Boolean).join(" "),
});

const buildActValidationContext = (payload) => {
  const data = payload.data || {};
  const copiesCount = normalizeCopiesCount(data.actCopies?.count);
  const copies = Array.isArray(data.actCopies?.copies)
    ? data.actCopies.copies
    : [];

  return {
    documentType: "act",
    markers: {
      expectedServiceSubtotalCount: Array.isArray(data.lostProperty)
        ? data.lostProperty.length
        : 0,
      expectedCopiesCount: copies.length || copiesCount,
      showCommanderConclusion: copiesCount > 1,
      chairman: normalizePerson(data.commission?.chairman),
      commissionMembers: (data.commission?.members || []).map(normalizePerson),
      eventWitnesses: (data.eventWitnesses || []).map(normalizePerson),
      supplyServiceChiefs: (data.supplyServiceChiefs || []).map(
        normalizePerson,
      ),
      commander: normalizePerson(data.commanderConclusion),
    },
  };
};

const evaluateCandidate = async ({
  payload,
  docxPath,
  pdfDir,
  profile,
  profileName,
  layoutProfile,
  validationContext,
}) => {
  const pdfPath = buildPdfPath(docxPath, pdfDir);

  try {
    await ensureParentDir(docxPath);
    await fs.mkdir(pdfDir, { recursive: true });

    await cleanupFileIfExists(docxPath);
    await cleanupFileIfExists(pdfPath);

    await generateActDocument(payload, docxPath, profile);
    const docxGeometry = await validateActDocxGeometry(
      docxPath,
      layoutProfile,
    );
    await convertToPdf(docxPath, pdfDir);

    const layout = await validateActLayout(pdfPath, validationContext);
    layout.docxGeometry = docxGeometry;
    layout.hardViolations = [
      ...docxGeometry.hardViolations,
      ...layout.hardViolations,
    ];
    layout.layoutFlags.actBlocksOk = layout.hardViolations.length === 0;
    layout.passed = layout.hardViolations.length === 0;

    if (DEBUG_ACT_LAYOUT) {
      console.log(
        `[runActGeneration] layout result: ${profileName} => ${JSON.stringify({
          passed: layout.passed,
          bottomMetric: layout.bottomMetric,
          hardViolations: layout.hardViolations.map((item) => item.code),
          marginViolations: layout.marginViolations,
        })}`,
      );
    }

    return {
      ok: true,
      profileName,
      profile,
      pages: layout.pages,
      hardViolations: layout.hardViolations,
      marginViolations: layout.marginViolations,
      layout,
      docxPath,
      pdfPath,
      artifacts: [docxPath, pdfPath],
    };
  } catch (error) {
    if (DEBUG_ACT_LAYOUT) {
      console.warn(`[runActGeneration] candidate failed: ${profileName}`);
      console.warn(error.message);
    }

    if (isFatalGenerationError(error)) throw error;

    return {
      ok: false,
      profileName,
      profile,
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

const isSafeCandidate = (candidate) =>
  candidate.ok &&
  candidate.hardViolations.length === 0 &&
  candidate.marginViolations.length === 0;

const profileInvariantFailureKey = (candidate) => {
  if (!candidate.ok) return "";
  return [
    ...new Set(
      candidate.hardViolations
        .map((item) => item.code)
        .filter((code) => PROFILE_INVARIANT_CODES.has(code)),
    ),
  ]
    .sort()
    .join(",");
};

const recordRejection = (summary, candidate) => {
  if (!candidate.ok) {
    summary.technicalErrors += 1;
    return;
  }

  for (const item of candidate.hardViolations) {
    summary.hardViolations[item.code] =
      (summary.hardViolations[item.code] || 0) + 1;
  }
  for (const item of candidate.marginViolations) {
    summary.marginViolations[item.status] =
      (summary.marginViolations[item.status] || 0) + 1;
  }
};

const logRejectionSummary = (summary, checkedCount) => {
  console.warn(
    `[runActGeneration] rejection summary checked=${checkedCount} ${JSON.stringify(summary)}`,
  );
};

const promoteCandidate = async ({
  candidate,
  finalDocxPath,
  finalPdfPath,
}) => {
  await ensureParentDir(finalDocxPath);
  await ensureParentDir(finalPdfPath);
  await cleanupFileIfExists(finalDocxPath);
  await cleanupFileIfExists(finalPdfPath);

  await fs.rename(candidate.docxPath, finalDocxPath);
  await fs.rename(candidate.pdfPath, finalPdfPath);

  return {
    ...candidate,
    docxPath: finalDocxPath,
    pdfPath: finalPdfPath,
  };
};

const buildResult = (candidate, status) => ({
  status,
  profile: candidate.profileName,
  layoutCheck: {
    status,
    profile: candidate.profileName,
    pages: candidate.pages,
    hardViolations: candidate.hardViolations,
    marginViolations: candidate.marginViolations,
    bottomMetric: candidate.layout.bottomMetric,
    docxGeometry: candidate.layout.docxGeometry,
  },
  resolvedProfile: candidate.profile,
  pages: candidate.pages,
  hardViolations: candidate.hardViolations,
  marginViolations: candidate.marginViolations,
  outputPath: candidate.docxPath,
  docxPath: candidate.docxPath,
  pdfPath: candidate.pdfPath,
});

const runActGeneration = async (report, job) => {
  const payload = buildPayload(report);
  const layoutProfile = resolveActLayoutProfile(payload);
  const profiles = actProfiles[layoutProfile];
  const pdfDir = buildPdfDir();
  const finalDocxPath = buildFinalDocxPath(job);
  const finalPdfPath = buildFinalPdfPath(job);
  const validationContext = buildActValidationContext(payload);
  const searchProfiles = buildActSearchProfiles(profiles || [], layoutProfile);
  const artifacts = [];
  const rejectionSummary = {
    hardViolations: {},
    marginViolations: {},
    technicalErrors: 0,
  };
  let repeatedInvariantKey = "";
  let repeatedInvariantCount = 0;

  if (!profiles || profiles.length === 0) {
    throw new Error(`Unknown act layoutProfile: ${layoutProfile}`);
  }

  const maxCheckedProfiles = profiles.length;

  try {
    for (let index = 0; index < maxCheckedProfiles; index++) {
      const profile = searchProfiles[index];
      const checkedCount = index + 1;

      if (checkedCount % 25 === 0) {
        console.log(
          `[runActGeneration] checked=${checkedCount}, currentProfile=${profile.name}`,
        );
      }

      const result = await evaluateCandidate({
        payload,
        docxPath: buildCandidateDocxPath(job, checkedCount),
        pdfDir,
        profile,
        profileName: profile.name,
        layoutProfile,
        validationContext,
      });
      artifacts.push(...result.artifacts);

      if (!isSafeCandidate(result)) {
        recordRejection(rejectionSummary, result);

        const invariantKey = profileInvariantFailureKey(result);
        if (invariantKey && invariantKey === repeatedInvariantKey) {
          repeatedInvariantCount += 1;
        } else {
          repeatedInvariantKey = invariantKey;
          repeatedInvariantCount = invariantKey ? 1 : 0;
        }

        if (repeatedInvariantCount >= PROFILE_INVARIANT_REPEAT_LIMIT) {
          logRejectionSummary(rejectionSummary, checkedCount);
          throw new Error(
            `Act profile-invariant validation failed after ${checkedCount} profiles: ${invariantKey}`,
          );
        }

        await cleanupArtifacts(result.artifacts);
        continue;
      }

      const promoted = await promoteCandidate({
        candidate: result,
        finalDocxPath,
        finalPdfPath,
      });
      console.log(
        `[runActGeneration] selected first fully valid profile=${profile.name} checked=${checkedCount}`,
      );
      lastSuccessfulProfileByLayout.set(layoutProfile, profile.name);
      return buildResult(promoted, "passed");
    }

    logRejectionSummary(rejectionSummary, maxCheckedProfiles);
    throw new Error(
      `No fully valid act profile found after checking ${maxCheckedProfiles} profiles`,
    );
  } finally {
    await cleanupArtifacts(
      artifacts.filter(
        (filePath) => filePath !== finalDocxPath && filePath !== finalPdfPath,
      ),
    );
  }
};

module.exports = runActGeneration;
