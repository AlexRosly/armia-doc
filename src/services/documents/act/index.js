const buildTemplateData = require("./buildTemplateDataAct");
const profiles = require("./profiles");
const generateActDocument = require("./generate");
const resolveActLayoutProfile = require("./resolveActLayoutProfile");
const iterateActProfiles = require("./iterateActProfiles");
const getCachedActProfile = require("./getCachedActProfile");
const saveCachedActProfile = require("./saveCachedActProfile");

module.exports = {
  buildTemplateData,
  profiles,
  generateActDocument,
  resolveActLayoutProfile,
  iterateActProfiles,
  getCachedActProfile,
  saveCachedActProfile,
};
