const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const REQUIRED_FONT_FAMILY = "Times New Roman";
const FORBIDDEN_SUBSTITUTIONS = ["Liberation", "Nimbus", "Noto"];

const assertRequiredFontsAvailable = async () => {
  let stdout = "";

  try {
    const result = await execFileAsync(
      "fc-match",
      ["-f", "%{family}", REQUIRED_FONT_FAMILY],
      {
        timeout: 5000,
        windowsHide: true,
      },
    );

    stdout = String(result.stdout || "").trim();
  } catch (error) {
    const startupError = new Error(
      "REQUIRED_FONT_UNAVAILABLE: Times New Roman\n" +
        "Document generation worker cannot start because font substitution would\n" +
        "invalidate DOCX pagination.",
    );

    startupError.code = "REQUIRED_FONT_UNAVAILABLE";
    startupError.details = {
      font: REQUIRED_FONT_FAMILY,
      reason: "fc-match-failed",
      originalMessage: error.message,
    };

    throw startupError;
  }

  const normalized = stdout.trim();

  const families = normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const primaryFamily = families[0] || "";
  const hasExactRequiredFamily = primaryFamily === REQUIRED_FONT_FAMILY;

  const hasForbiddenSubstitution = families.some((family) =>
    FORBIDDEN_SUBSTITUTIONS.some((bad) => family.includes(bad)),
  );

  if (!hasExactRequiredFamily || hasForbiddenSubstitution) {
    const startupError = new Error(
      "REQUIRED_FONT_UNAVAILABLE: Times New Roman\n" +
        "Document generation worker cannot start because font substitution would\n" +
        "invalidate DOCX pagination.",
    );

    startupError.code = "REQUIRED_FONT_UNAVAILABLE";
    startupError.details = {
      font: REQUIRED_FONT_FAMILY,
      fcMatchOutput: normalized,
      primaryFamily,
      hasExactRequiredFamily,
      hasForbiddenSubstitution,
    };

    throw startupError;
  }

  console.log(
    `[startup] required font check passed: ${REQUIRED_FONT_FAMILY} (fc-match: ${normalized})`,
  );
};

module.exports = assertRequiredFontsAvailable;
