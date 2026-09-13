const buildPropertyGroups = require("./buildPropertyGroups");

const buildIntroPropertyGroups = (lostProperty = []) =>
  buildPropertyGroups(lostProperty, { includeCost: false });

module.exports = buildIntroPropertyGroups;
