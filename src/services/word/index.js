const renderTemplate = require("./renderTemplate");
const mergeDocuments = require("./mergeDocuments");
const applyDocumentPaginationFixes = require("./applyDocumentPaginationFixes");
const fixOrderNakazuiuPagination = require("./fixOrderNakazuiuPagination");
const fixReportProshuPagination = require("./fixReportProshuPagination");
const fixSignatureTablePagination = require("./fixSignatureTablePagination");
const fixOrderDirectiveSectionPagination = require("./fixOrderDirectiveSectionPagination");
const forceReportProshuBlockToNextPage = require("./forceReportProshuBlockToNextPage");

module.exports = {
  renderTemplate,
  mergeDocuments,
  applyDocumentPaginationFixes,
  fixOrderNakazuiuPagination,
  fixReportProshuPagination,
  fixSignatureTablePagination,
  fixOrderDirectiveSectionPagination,
  forceReportProshuBlockToNextPage,
};
