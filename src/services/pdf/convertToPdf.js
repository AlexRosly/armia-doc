const { exec } = require("child_process");
const fs = require("fs/promises");
const os = require("os");

const execPromise = (command, timeout = 120000) =>
  new Promise((resolve, reject) => {
    exec(
      command,
      {
        timeout,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          return reject(error);
        }

        resolve({ stdout, stderr });
      },
    );
  });

const getLibreOfficeCommand = async () => {
  //
  // WINDOWS
  //
  if (os.platform() === "win32") {
    return `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
  }

  //
  // LINUX / MAC
  //
  for (const command of ["soffice", "libreoffice"]) {
    try {
      await execPromise(`which ${command}`, 3000);
      return command;
    } catch (_) {}
  }

  throw new Error("LibreOffice is not installed or is not available in PATH.");
};

const convertToPdf = async (docxPath, outputDir) => {
  //
  // CHECK DOCX EXISTS
  //
  await fs.access(docxPath);

  const libreOfficeCmd = await getLibreOfficeCommand();

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
    await execPromise(command);
  } catch (error) {
    console.error("========== PDF CONVERSION ERROR ==========");
    console.error("Command:", command);
    console.error("stdout:", error.stdout);
    console.error("stderr:", error.stderr);
    console.error("==========================================");

    throw new Error(
      error.stderr || error.message || "Unknown LibreOffice error",
    );
  }
};

module.exports = convertToPdf;
