const { exec } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const DEFAULT_TIMEOUT_MS = 120000;
const WINDOWS_LIBREOFFICE_PATH =
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

const execPromise = (command, timeout = DEFAULT_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout || "";
        error.stderr = stderr || "";
        return reject(error);
      }

      resolve({
        stdout: stdout || "",
        stderr: stderr || "",
      });
    });
  });

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
    return `"${WINDOWS_LIBREOFFICE_PATH}"`;
  }

  for (const command of ["soffice", "libreoffice"]) {
    try {
      await execPromise(`which ${command}`, 3000);
      return command;
    } catch (_) {}
  }

  throw new Error("LibreOffice is not installed or is not available in PATH.");
};

const convertToPdf = async (docxPath, outputDir, options = {}) => {
  const { timeout = DEFAULT_TIMEOUT_MS, settleDelayMs = 150 } = options;

  await fs.access(docxPath);
  await fs.mkdir(outputDir, { recursive: true });

  const libreOfficeCmd = await getLibreOfficeCommand();
  const pdfPath = getPdfPath(docxPath, outputDir);

  const command =
    `${libreOfficeCmd} ` +
    "--headless " +
    "--nologo " +
    "--nolockcheck " +
    "--nodefault " +
    "--nofirststartwizard " +
    `--convert-to pdf "${docxPath}" ` +
    `--outdir "${outputDir}"`;

  try {
    await execPromise(command, timeout);

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
      console.warn("========== PDF CONVERSION WARNING ==========");
      console.warn("LibreOffice returned an error, but PDF exists.");
      console.warn("Command:", command);
      console.warn("stdout:", error.stdout || "");
      console.warn("stderr:", error.stderr || "");
      console.warn("pdfPath:", pdfPath);
      console.warn("============================================");

      return pdfPath;
    }

    console.error("========== PDF CONVERSION ERROR ==========");
    console.error("Command:", command);
    console.error("stdout:", error.stdout || "");
    console.error("stderr:", error.stderr || "");
    console.error("pdfPath:", pdfPath);
    console.error("==========================================");

    throw new Error(
      error.stderr?.trim() ||
        error.stdout?.trim() ||
        error.message ||
        "Unknown LibreOffice error",
    );
  }
};

module.exports = convertToPdf;
// const { exec } = require("child_process");
// const fs = require("fs/promises");
// const os = require("os");
// const path = require("path");

// const execPromise = (command, timeout = 120000) =>
//   new Promise((resolve, reject) => {
//     exec(
//       command,
//       {
//         timeout,
//       },
//       (error, stdout, stderr) => {
//         if (error) {
//           error.stdout = stdout;
//           error.stderr = stderr;
//           return reject(error);
//         }

//         resolve({ stdout, stderr });
//       },
//     );
//   });

// const getLibreOfficeCommand = async () => {
//   if (os.platform() === "win32") {
//     return `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
//   }

//   for (const command of ["soffice", "libreoffice"]) {
//     try {
//       await execPromise(`which ${command}`, 3000);
//       return command;
//     } catch (_) {}
//   }

//   throw new Error("LibreOffice is not installed or is not available in PATH.");
// };

// const getPdfPath = (docxPath, outputDir) =>
//   path.join(outputDir, `${path.parse(docxPath).name}.pdf`);

// const fileExistsAndNotEmpty = async (filePath) => {
//   try {
//     const stat = await fs.stat(filePath);
//     return stat.isFile() && stat.size > 0;
//   } catch (_) {
//     return false;
//   }
// };

// const convertToPdf = async (docxPath, outputDir) => {
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
//     await execPromise(command);

//     const pdfExists = await fileExistsAndNotEmpty(pdfPath);
//     if (!pdfExists) {
//       throw new Error(`PDF was not created: ${pdfPath}`);
//     }

//     return pdfPath;
//   } catch (error) {
//     const pdfExists = await fileExistsAndNotEmpty(pdfPath);

//     if (pdfExists) {
//       console.warn("========== PDF CONVERSION WARNING ==========");
//       console.warn("LibreOffice returned an error, but PDF exists.");
//       console.warn("Command:", command);
//       console.warn("stdout:", error.stdout);
//       console.warn("stderr:", error.stderr);
//       console.warn("pdfPath:", pdfPath);
//       console.warn("============================================");

//       return pdfPath;
//     }

//     console.error("========== PDF CONVERSION ERROR ==========");
//     console.error("Command:", command);
//     console.error("stdout:", error.stdout);
//     console.error("stderr:", error.stderr);
//     console.error("pdfPath:", pdfPath);
//     console.error("==========================================");

//     throw new Error(
//       error.stderr || error.message || "Unknown LibreOffice error",
//     );
//   }
// };

// module.exports = convertToPdf;
// const { exec } = require("child_process");
// const fs = require("fs/promises");
// const os = require("os");

// const execPromise = (command, timeout = 120000) =>
//   new Promise((resolve, reject) => {
//     exec(
//       command,
//       {
//         timeout,
//       },
//       (error, stdout, stderr) => {
//         if (error) {
//           error.stdout = stdout;
//           error.stderr = stderr;
//           return reject(error);
//         }

//         resolve({ stdout, stderr });
//       },
//     );
//   });

// const getLibreOfficeCommand = async () => {
//   //
//   // WINDOWS
//   //
//   if (os.platform() === "win32") {
//     return `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
//   }

//   //
//   // LINUX / MAC
//   //
//   for (const command of ["soffice", "libreoffice"]) {
//     try {
//       await execPromise(`which ${command}`, 3000);
//       return command;
//     } catch (_) {}
//   }

//   throw new Error("LibreOffice is not installed or is not available in PATH.");
// };

// const convertToPdf = async (docxPath, outputDir) => {
//   //
//   // CHECK DOCX EXISTS
//   //
//   await fs.access(docxPath);

//   const libreOfficeCmd = await getLibreOfficeCommand();

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
//     await execPromise(command);
//   } catch (error) {
//     console.error("========== PDF CONVERSION ERROR ==========");
//     console.error("Command:", command);
//     console.error("stdout:", error.stdout);
//     console.error("stderr:", error.stderr);
//     console.error("==========================================");

//     throw new Error(
//       error.stderr || error.message || "Unknown LibreOffice error",
//     );
//   }
// };

// module.exports = convertToPdf;
