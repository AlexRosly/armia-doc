const buildTemplateData = require("./buildTemplateDataOrder");
const profiles = require("./profiles");
const generateOrderDocument = require("./generate");
const resolveProfilePair = require("./resolveProfilePair");
const generateOrderOnlyDocument = require("./generateOrderOnlyDocument");
const generateApprovalOnlyDocument = require("./generateApprovalOnlyDocument");
const ORDER_PRINT_SETTINGS = require("./orderPrintSettings");

module.exports = {
  buildTemplateData,
  profiles,
  generateOrderDocument,
  resolveProfilePair,
  generateOrderOnlyDocument,
  generateApprovalOnlyDocument,
  ORDER_PRINT_SETTINGS,
};
