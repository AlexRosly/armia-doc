const buildTemplateData = require("./buildTemplateDataOrder");
const profiles = require("./profiles");
const generateOrderDocument = require("./generate");
const resolveProfilePair = require("./resolveProfilePair");

module.exports = {
  buildTemplateData,
  profiles,
  generateOrderDocument,
  resolveProfilePair,
};
