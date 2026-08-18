// const {
//   normalizeText,
//   pushViolation,
//   groupItemsToLines,
//   buildPagesFromPdf,
//   validateBottomMargins,
//   validateEmptyLastPage,
// } = require("./common");

// const validateReportLayoutRules = require("./report");
// const validateOrderLayoutRules = require("./order");

// module.exports = {
//   normalizeText,
//   pushViolation,
//   groupItemsToLines,
//   buildPagesFromPdf,
//   validateBottomMargins,
//   validateEmptyLastPage,
//   validateReportLayoutRules,
//   validateOrderLayoutRules,
// };
const {
  normalizeText,
  pushViolation,
  groupItemsToLines,
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
  detectSystemicBottomWhitespace,
} = require("./common");

const validateReportLayoutRules = require("./report");
const validateOrderLayoutRules = require("./order");

module.exports = {
  normalizeText,
  pushViolation,
  groupItemsToLines,
  buildPagesFromPdf,
  validateBottomMargins,
  validateEmptyLastPage,
  detectSystemicBottomWhitespace,
  validateReportLayoutRules,
  validateOrderLayoutRules,
};
