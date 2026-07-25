// const { exec } = require("child_process");
// const fs = require("fs/promises");
// const os = require("os");
// const path = require("path");

// const DEFAULT_TIMEOUT_MS = 120000;
// const WINDOWS_LIBREOFFICE_PATH =
//   "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

// const execPromise = (command, timeout = DEFAULT_TIMEOUT_MS) =>
//   new Promise((resolve, reject) => {
//     exec(command, { timeout }, (error, stdout, stderr) => {
//       if (error) {
//         error.stdout = stdout || "";
//         error.stderr = stderr || "";
//         return reject(error);
//       }

//       resolve({
//         stdout: stdout || "",
//         stderr: stderr || "",
//       });
//     });
//   });

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const fileExistsAndNotEmpty = async (filePath) => {
//   try {
//     const stat = await fs.stat(filePath);
//     return stat.isFile() && stat.size > 0;
//   } catch (_) {
//     return false;
//   }
// };

// const getPdfPath = (docxPath, outputDir) =>
//   path.join(outputDir, `${path.parse(docxPath).name}.pdf`);

// const getLibreOfficeCommand = async () => {
//   if (os.platform() === "win32") {
//     await fs.access(WINDOWS_LIBREOFFICE_PATH);
//     return `"${WINDOWS_LIBREOFFICE_PATH}"`;
//   }

//   for (const command of ["soffice", "libreoffice"]) {
//     try {
//       await execPromise(`which ${command}`, 3000);
//       return command;
//     } catch (_) {}
//   }

//   throw new Error("LibreOffice is not installed or is not available in PATH.");
// };

// const convertToPdf = async (docxPath, outputDir, options = {}) => {
//   const { timeout = DEFAULT_TIMEOUT_MS, settleDelayMs = 150 } = options;

//   await fs.access(docxPath);
//   await fs.mkdir(outputDir, { recursive: true });

//   const libreOfficeCmd = await getLibreOfficeCommand();
//   const pdfPath = getPdfPath(docxPath, outputDir);

//   const command =
//     `${libreOfficeCmd} ` +
//     "--headless " +
//     "--nologo " +
//     "--nolockcheck " +
//     "--nodefault " +
//     "--nofirststartwizard " +
//     `--convert-to pdf "${docxPath}" ` +
//     `--outdir "${outputDir}"`;

//   try {
//     await execPromise(command, timeout);

//     if (settleDelayMs > 0) {
//       await sleep(settleDelayMs);
//     }

//     const pdfExists = await fileExistsAndNotEmpty(pdfPath);
//     if (!pdfExists) {
//       throw new Error(`PDF was not created: ${pdfPath}`);
//     }

//     return pdfPath;
//   } catch (error) {
//     if (settleDelayMs > 0) {
//       await sleep(settleDelayMs);
//     }

//     const pdfExists = await fileExistsAndNotEmpty(pdfPath);

//     if (pdfExists) {
//       console.warn("========== PDF CONVERSION WARNING ==========");
//       console.warn("LibreOffice returned an error, but PDF exists.");
//       console.warn("Command:", command);
//       console.warn("stdout:", error.stdout || "");
//       console.warn("stderr:", error.stderr || "");
//       console.warn("pdfPath:", pdfPath);
//       console.warn("============================================");

//       return pdfPath;
//     }

//     console.error("========== PDF CONVERSION ERROR ==========");
//     console.error("Command:", command);
//     console.error("stdout:", error.stdout || "");
//     console.error("stderr:", error.stderr || "");
//     console.error("pdfPath:", pdfPath);
//     console.error("==========================================");

//     throw new Error(
//       error.stderr?.trim() ||
//         error.stdout?.trim() ||
//         error.message ||
//         "Unknown LibreOffice error",
//     );
//   }
// };

// module.exports = convertToPdf;
// const { exec } = require("child_process");
// const fs = require("fs/promises");
// const os = require("os");
// const path = require("path");

// const DEFAULT_TIMEOUT_MS = 120000;
// const WINDOWS_LIBREOFFICE_PATH =
//   "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

// let conversionQueue = Promise.resolve();

// const execPromise = (command, timeout = DEFAULT_TIMEOUT_MS) =>
//   new Promise((resolve, reject) => {
//     exec(command, { timeout }, (error, stdout, stderr) => {
//       if (error) {
//         error.stdout = stdout || "";
//         error.stderr = stderr || "";
//         return reject(error);
//       }

//       resolve({
//         stdout: stdout || "",
//         stderr: stderr || "",
//       });
//     });
//   });

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const fileExistsAndNotEmpty = async (filePath) => {
//   try {
//     const stat = await fs.stat(filePath);
//     return stat.isFile() && stat.size > 0;
//   } catch (_) {
//     return false;
//   }
// };

// const getPdfPath = (docxPath, outputDir) =>
//   path.join(outputDir, `${path.parse(docxPath).name}.pdf`);

// const getLibreOfficeCommand = async () => {
//   if (os.platform() === "win32") {
//     await fs.access(WINDOWS_LIBREOFFICE_PATH);
//     return `"${WINDOWS_LIBREOFFICE_PATH}"`;
//   }

//   for (const command of ["soffice", "libreoffice"]) {
//     try {
//       await execPromise(`which ${command}`, 3000);
//       return command;
//     } catch (_) {}
//   }

//   throw new Error("LibreOffice is not installed or is not available in PATH.");
// };

// const runConvertToPdf = async (docxPath, outputDir, options = {}) => {
//   const { timeout = DEFAULT_TIMEOUT_MS, settleDelayMs = 500 } = options;

//   await fs.access(docxPath);
//   await fs.mkdir(outputDir, { recursive: true });

//   const libreOfficeCmd = await getLibreOfficeCommand();
//   const pdfPath = getPdfPath(docxPath, outputDir);

//   const command =
//     `${libreOfficeCmd} ` +
//     "--headless " +
//     "--nologo " +
//     "--nolockcheck " +
//     "--nodefault " +
//     "--nofirststartwizard " +
//     `--convert-to pdf "${docxPath}" ` +
//     `--outdir "${outputDir}"`;

//   try {
//     await execPromise(command, timeout);

//     if (settleDelayMs > 0) {
//       await sleep(settleDelayMs);
//     }

//     const pdfExists = await fileExistsAndNotEmpty(pdfPath);
//     if (!pdfExists) {
//       throw new Error(`PDF was not created: ${pdfPath}`);
//     }

//     return pdfPath;
//   } catch (error) {
//     if (settleDelayMs > 0) {
//       await sleep(settleDelayMs);
//     }

//     const pdfExists = await fileExistsAndNotEmpty(pdfPath);

//     if (pdfExists) {
//       console.warn("========== PDF CONVERSION WARNING ==========");
//       console.warn("LibreOffice returned an error, but PDF exists.");
//       console.warn("Command:", command);
//       console.warn("stdout:", error.stdout || "");
//       console.warn("stderr:", error.stderr || "");
//       console.warn("pdfPath:", pdfPath);
//       console.warn("============================================");

//       return pdfPath;
//     }

//     console.error("========== PDF CONVERSION ERROR ==========");
//     console.error("Command:", command);
//     console.error("stdout:", error.stdout || "");
//     console.error("stderr:", error.stderr || "");
//     console.error("pdfPath:", pdfPath);
//     console.error("==========================================");

//     throw new Error(
//       error.stderr?.trim() ||
//         error.stdout?.trim() ||
//         error.message ||
//         "Unknown LibreOffice error",
//     );
//   }
// };

// const convertToPdf = (docxPath, outputDir, options = {}) => {
//   const next = conversionQueue.then(() =>
//     runConvertToPdf(docxPath, outputDir, options),
//   );

//   conversionQueue = next.catch(() => {});
//   return next;
// };

// module.exports = convertToPdf;
const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const DEFAULT_TIMEOUT_MS = 120000;
const WINDOWS_LIBREOFFICE_PATH =
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

let conversionQueue = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fileExistsAndNotEmpty = async (filePath) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch (_) {
    return false;
  }
};

const getPdfPath = (docxPath, outputDir) =>
  path.join(outputDir, `${path.parse(docxPath).name}.pdf`);

const getLibreOfficeCommand = async () => {
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

const spawnPromise = (command, args, timeout = DEFAULT_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        child.kill();
      }
    }, timeout);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      finished = true;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      finished = true;

      if (code === 0) {
        resolve({ stdout, stderr, code, signal });
        return;
      }

      const error = new Error(`LibreOffice exited with code ${code}`);
      error.code = code;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });

const runConvertToPdf = async (docxPath, outputDir, options = {}) => {
  const { timeout = DEFAULT_TIMEOUT_MS, settleDelayMs = 500 } = options;

  await fs.access(docxPath);
  await fs.mkdir(outputDir, { recursive: true });

  const libreOfficeCmd = await getLibreOfficeCommand();
  const pdfPath = getPdfPath(docxPath, outputDir);

  const args = [
    "--headless",
    "--nologo",
    "--nolockcheck",
    "--nodefault",
    "--nofirststartwizard",
    "--convert-to",
    "pdf",
    docxPath,
    "--outdir",
    outputDir,
  ];

  try {
    await spawnPromise(libreOfficeCmd, args, timeout);

    if (settleDelayMs > 0) {
      await sleep(settleDelayMs);
    }

    const pdfExists = await fileExistsAndNotEmpty(pdfPath);
    if (!pdfExists) {
      throw new Error(`PDF was not created: ${pdfPath}`);
    }

    return pdfPath;
  } catch (error) {
    if (settleDelayMs > 0) {
      await sleep(settleDelayMs);
    }

    const pdfExists = await fileExistsAndNotEmpty(pdfPath);

    if (pdfExists) {
      console.info("========== PDF CONVERSION NOTICE ==========");
      console.info("LibreOffice returned non-zero exit code, but PDF exists.");
      console.info("exit code:", error.code);
      console.info("signal:", error.signal);
      console.info("stdout:", error.stdout || "");
      console.info("stderr:", error.stderr || "");
      console.info("pdfPath:", pdfPath);
      console.info("===========================================");

      return pdfPath;
    }

    console.error("========== PDF CONVERSION ERROR ==========");
    console.error("exit code:", error.code);
    console.error("signal:", error.signal);
    console.error("stdout:", error.stdout || "");
    console.error("stderr:", error.stderr || "");
    console.error("pdfPath:", pdfPath);
    console.error("==========================================");

    throw new Error(
      [
        error.message,
        error.code !== undefined ? `code=${error.code}` : null,
        error.stderr?.trim(),
        error.stdout?.trim(),
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }
};

const convertToPdf = (docxPath, outputDir, options = {}) => {
  const next = conversionQueue.then(() =>
    runConvertToPdf(docxPath, outputDir, options),
  );

  conversionQueue = next.catch(() => {});
  return next;
};

module.exports = convertToPdf;
