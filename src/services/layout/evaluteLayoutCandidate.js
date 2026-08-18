const evaluateReportLayoutFromPdf = require("./validators/report");
const evaluateOrderLayoutFromPdf = require("./validators/order");

async function evaluteLayoutCandidate({
  documentType,
  pdfBuffer,
  templateName = null,
  variant = "base",
}) {
  if (documentType === "report") {
    return evaluateReportLayoutFromPdf({
      pdfBuffer,
      templateName,
      variant,
    });
  }

  if (documentType === "order") {
    return evaluateOrderLayoutFromPdf({
      pdfBuffer,
      templateName,
      variant,
    });
  }

  throw new Error(
    `Unsupported documentType for evaluteLayoutCandidate: ${documentType}`,
  );
}

module.exports = evaluteLayoutCandidate;
