// const { exec } = require("child_process");

// const convertToPdf = (docxPath, outputDir) => {
//   return new Promise((resolve, reject) => {
//     exec(
//       `libreoffice --headless --convert-to pdf "${docxPath}" --outdir "${outputDir}"`,
//       (error) => {
//         if (error) {
//           return reject(error);
//         }

//         resolve();
//       },
//     );
//   });
// };

// module.exports = convertToPdf;
const { exec } = require("child_process");
const os = require("os");

const convertToPdf = (docxPath, outputDir) => {
  return new Promise((resolve, reject) => {
    const libreOfficeCmd =
      os.platform() === "win32"
        ? `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`
        : "libreoffice";

    exec(
      `${libreOfficeCmd} --headless --convert-to pdf "${docxPath}" --outdir "${outputDir}"`,
      (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }

        resolve();
      },
    );
  });
};

module.exports = convertToPdf;
