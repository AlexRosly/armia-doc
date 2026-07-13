const act = require("../documents/act");
const order = require("../documents/order");
const report = require("../documents/report");

const generateDocx = async (payload, outputPath, profile) => {
  switch (payload.documentType) {
    case "act":
      return act.generateActDocument(payload, outputPath, profile);

    case "report":
      return report.generateReportDocument(payload, outputPath, profile);

    case "order": {
      const resolvedProfile = order.resolveProfilePair(profile);
      return order.generateOrderDocument(payload, outputPath, resolvedProfile);
    }

    default:
      throw new Error(`Unsupported document type: ${payload.documentType}`);
  }
};

module.exports = generateDocx;
