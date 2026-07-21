const { ORDER_PRINT_SETTINGS } = require("../order");
const { normalizePrintMode } = require("../report/applyReportPrintSettings");

const resolvePrintSettings = ({ documentType, payload }) => {
  if (documentType === "order") {
    return ORDER_PRINT_SETTINGS;
  }

  if (documentType === "report") {
    const rawPrintMode =
      payload?.data?.printSettings?.printMode ??
      payload?.printSettings?.printMode ??
      payload?.printMode ??
      "duplex";

    return {
      printMode: normalizePrintMode(rawPrintMode),
    };
  }

  return {
    printMode: "duplex",
  };
};

module.exports = {
  resolvePrintSettings,
};
