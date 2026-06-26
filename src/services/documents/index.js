const report = require("./report");
const order = require("./order");
const act = require("./act");

module.exports = {
  report,
  order,
  act,
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
