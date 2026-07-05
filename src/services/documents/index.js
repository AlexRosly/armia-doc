const report = require("./report");
const order = require("./order");
const act = require("./act");
const shared = require("./shared");

module.exports = {
  report,
  order,
  act,
  shared,
};

// module.exports = documentBuilders;
// const buildTemplateDataReport = require("./report/buildTemplateDataReport");

// module.exports = {
//   report: {
//     buildTemplateData: buildTemplateDataReport,
//   },

// order: {
//   buildTemplateData: require("./order/buildTemplateData"),
// },

// writeOffAct: {
//   buildTemplateData: require("./writeOffAct/buildTemplateData"),
// },
// };
