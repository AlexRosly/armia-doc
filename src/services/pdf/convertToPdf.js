const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const DEFAULT_TIMEOUT_MS = 120000;
const EXTRA_BATCH_FILE_TIMEOUT_MS = 30000;
const DEFAULT_SETTLE_TIMEOUT_MS = 4000;
const DEFAULT_SETTLE_POLL_MS = 50;
const WINDOWS_LIBREOFFICE_PATH =
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

// One LibreOffice process at a time remains the safe default. The speed-up is
// achieved by sending several candidates to the same process, not by racing
// multiple LibreOffice instances against one shared user profile.
let conversionQueue = Promise.resolve();
let libreOfficeCommandPromise = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fileExistsAndNotEmpty = async (filePath) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch (_) {
    return false;
  }
};

const deleteIfExists = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const getPdfPath = (docxPath, outputDir) =>
  path.join(outputDir, `${path.parse(docxPath).name}.pdf`);

const resolveLibreOfficeCommand = async () => {
  if (os.platform() === "win32") {
    await fs.access(WINDOWS_LIBREOFFICE_PATH);
    return WINDOWS_LIBREOFFICE_PATH;
  }

  for (const command of ["soffice", "libreoffice"]) {
    try {
      await fs.access(`/usr/bin/${command}`);
      return command;
    } catch (_) {}
  }

  return "soffice";
};

const getLibreOfficeCommand = () => {
  if (!libreOfficeCommandPromise) {
    libreOfficeCommandPromise = resolveLibreOfficeCommand().catch((error) => {
      libreOfficeCommandPromise = null;
      throw error;
    });
  }
  return libreOfficeCommandPromise;
};

const spawnPromise = (command, args, timeout) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeout);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      error.stdout = stdout;
      error.stderr = stderr;
      finish(reject, error);
    });

    child.on("close", (code, signal) => {
      if (code === 0 && !timedOut) {
        finish(resolve, { stdout, stderr, code, signal });
        return;
      }

      const error = new Error(
        timedOut
          ? `LibreOffice timed out after ${timeout} ms`
          : `LibreOffice exited with code ${code}`,
      );
      error.code = code;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      finish(reject, error);
    });
  });

const waitForPdfFiles = async (pdfPaths, options = {}) => {
  const timeoutMs = Number(
    options.settleTimeoutMs ?? DEFAULT_SETTLE_TIMEOUT_MS,
  );
  const pollMs = Number(options.settlePollMs ?? DEFAULT_SETTLE_POLL_MS);
  const deadline = Date.now() + Math.max(0, timeoutMs);

  do {
    const states = await Promise.all(pdfPaths.map(fileExistsAndNotEmpty));
    if (states.every(Boolean)) return [];
    if (Date.now() >= deadline) {
      return pdfPaths.filter((_, index) => !states[index]);
    }
    await sleep(Math.max(10, pollMs));
  } while (true);
};

const normalizeDocxPaths = (docxPaths) => {
  const paths = Array.isArray(docxPaths) ? docxPaths : [docxPaths];
  const normalized = paths.filter(
    (filePath) => typeof filePath === "string" && filePath.trim(),
  );
  if (!normalized.length) throw new Error("No DOCX files provided for conversion");
  return normalized;
};

const runLibreOfficeConversion = async (
  docxPaths,
  outputDir,
  options = {},
) => {
  const inputs = normalizeDocxPaths(docxPaths);
  await Promise.all(inputs.map((filePath) => fs.access(filePath)));
  await fs.mkdir(outputDir, { recursive: true });

  const pdfPaths = inputs.map((filePath) => getPdfPath(filePath, outputDir));

  // Never accept a PDF left by a previous retry as the result of this run.
  await Promise.all(pdfPaths.map(deleteIfExists));

  const libreOfficeCmd = await getLibreOfficeCommand();
  const timeout = Number(
    options.timeout ??
      DEFAULT_TIMEOUT_MS +
        Math.max(0, inputs.length - 1) * EXTRA_BATCH_FILE_TIMEOUT_MS,
  );
  const args = [
    "--headless",
    "--nologo",
    "--nolockcheck",
    "--nodefault",
    "--nofirststartwizard",
    "--convert-to",
    "pdf",
    "--outdir",
    outputDir,
    ...inputs,
  ];

  let processError = null;
  try {
    await spawnPromise(libreOfficeCmd, args, timeout);
  } catch (error) {
    processError = error;
  }

  const missing = await waitForPdfFiles(pdfPaths, options);
  if (!missing.length) {
    if (processError) {
      console.info(
        `[pdf] LibreOffice returned an error but created all ${pdfPaths.length} PDF file(s): ${processError.message}`,
      );
    }
    return pdfPaths;
  }

  const error = new Error(
    [
      processError?.message || "LibreOffice did not create every PDF",
      `missing=${missing.join(",")}`,
      processError?.stderr?.trim(),
      processError?.stdout?.trim(),
    ]
      .filter(Boolean)
      .join(" | "),
  );
  error.missingPdfPaths = missing;
  error.stdout = processError?.stdout || "";
  error.stderr = processError?.stderr || "";
  throw error;
};

const runConvertManyToPdf = async (docxPaths, outputDir, options = {}) => {
  const inputs = normalizeDocxPaths(docxPaths);

  try {
    return await runLibreOfficeConversion(inputs, outputDir, options);
  } catch (batchError) {
    if (inputs.length === 1 || options.singleFallback === false) {
      throw batchError;
    }

    console.warn(
      `[pdf] batch conversion failed for ${inputs.length} file(s); retrying one by one: ${batchError.message}`,
    );

    const pdfPaths = [];
    const failures = [];

    for (const docxPath of inputs) {
      try {
        const [pdfPath] = await runLibreOfficeConversion(
          [docxPath],
          outputDir,
          { ...options, singleFallback: false },
        );
        pdfPaths.push(pdfPath);
      } catch (error) {
        failures.push({ docxPath, error });
      }
    }

    if (failures.length) {
      const error = new Error(
        `PDF fallback failed for: ${failures
          .map((item) => item.docxPath)
          .join(", ")}`,
      );
      error.cause = batchError;
      error.failures = failures;
      error.successfulPdfPaths = pdfPaths;
      throw error;
    }

    return pdfPaths;
  }
};

const enqueueConversion = (task) => {
  const next = conversionQueue.then(task);
  conversionQueue = next.catch(() => {});
  return next;
};

const convertManyToPdf = (docxPaths, outputDir, options = {}) =>
  enqueueConversion(() =>
    runConvertManyToPdf(docxPaths, outputDir, options),
  );

const convertToPdf = async (docxPath, outputDir, options = {}) => {
  const [pdfPath] = await convertManyToPdf([docxPath], outputDir, options);
  return pdfPath;
};

module.exports = convertToPdf;
module.exports.convertManyToPdf = convertManyToPdf;
