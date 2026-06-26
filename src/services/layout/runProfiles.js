// const profiles = require("./profiles");

// const generateDocx = require("../docx/generateDocx");

// const convertToPdf = require("../pdf/convertToPdf");

// const validateLayout = require("./validateLayout");

// module.exports = async function runProfiles() {
//   return {
//     status: "passed",
//     profile: "default_14_100_top_20",
//     pages: [],
//   };
// };

// const validateLayout = require("./validateLayout");

// const runProfiles = async (pdfPath) => {
//   const pages = await validateLayout(pdfPath);

//   const hasErrors = pages.some((page) => page.deviationCm > 0);

//   return {
//     status: hasErrors ? "best_effort" : "passed",

//     profile: "default_14_100_top_20",

//     pages,
//   };
// };
const path = require("path");
// const profiles = require("./profiles");
// const bestEffortSelector = require("./bestEffortSelector");
const { generateDocx } = require("../docx");
const { convertToPdf } = require("../pdf");
const validateLayout = require("./validateLayout");
const documents = require("../documents");

const runProfiles = async (report, job) => {
  let bestResult = null;

  const documentConfig = documents[report.documentType];

  const profiles = documentConfig.profiles;

  for (const profile of profiles) {
    const docxPath = path.join(
      process.cwd(),
      "storage",
      "docx",
      `${job._id}.docx`,
    );

    const pdfDir = path.join(process.cwd(), "storage", "pdf");

    await generateDocx(report.toObject(), docxPath, profile);

    await convertToPdf(docxPath, pdfDir);

    const pdfPath = path.join(pdfDir, `${job._id}.pdf`);

    const pages = await validateLayout(pdfPath);

    const hasError = pages.some((page) => page.status === "below_min");

    if (!hasError) {
      return {
        status: "passed",

        profile: profile.name,

        pages,
      };
    }

    bestResult = {
      status: "best_effort",

      profile: profile.name,

      pages,
    };
  }
  return bestResult;
};

// const runProfiles = async (report, job) => {
//   let bestResult = null;

//   for (const profile of profiles) {
//     const docxPath = path.join(
//       process.cwd(),
//       "storage",
//       "docx",
//       `${job._id}.docx`,
//     );

//     const pdfDir = path.join(process.cwd(), "storage", "pdf");

//     await generateDocx(report.toObject(), docxPath, profile);

//     await convertToPdf(docxPath, pdfDir);

//     const pdfPath = path.join(pdfDir, `${job._id}.pdf`);

//     const pages = await validateLayout(pdfPath);

//     const hasErrors = pages.some((page) => page.status === "below_min");

//     if (!hasErrors) {
//       return {
//         status: "passed",

//         profile: profile.name,

//         pages,
//       };
//     }

//     bestResult = {
//       status: "best_effort",

//       profile: profile.name,

//       pages,
//     };
//   }

//   return bestResult;
// };

// const runProfiles = async (report, jobId) => {
//   const candidates = [];

//   for (const profile of profiles) {
//     const docxPath = path.join(
//       process.cwd(),
//       "storage",
//       "docx",
//       `${jobId}.docx`,
//     );

//     const pdfDir = path.join(process.cwd(), "storage", "pdf");

//     const pdfPath = path.join(pdfDir, `${jobId}.pdf`);

//     await generateDocx(report.toObject(), docxPath, profile);

//     await convertToPdf(docxPath, pdfDir);

//     const pages = await validateLayout(pdfPath);

//     const passed = pages.every(
//       (page) => page.status === "target" || page.status === "last_page_allowed",
//     );

//     const result = {
//       status: passed ? "passed" : "best_effort",

//       profile: profile.name,

//       pages,
//     };

//     candidates.push(result);

//     if (passed) {
//       return result;
//     }
//   }

//   return bestEffortSelector(candidates);
// };

// const runProfiles = async (generateProfile) => {
//   let bestResult = null;

//   for (const profile of profiles) {
//     const pdfPath = await generateProfile(profile);

//     const pages = await validateLayout(pdfPath);

//     const failedPages = pages.filter((page) => page.status !== "passed");

//     const result = {
//       status: failedPages.length === 0 ? "passed" : "best_effort",

//       profile: profile.name,

//       pages,
//     };

//     if (result.status === "passed") {
//       return result;
//     }

//     bestResult = result;
//   }

//   return (
//     bestResult || {
//       status: "failed",
//       profile: null,
//       pages: [],
//     }
//   );
// };

module.exports = runProfiles;
