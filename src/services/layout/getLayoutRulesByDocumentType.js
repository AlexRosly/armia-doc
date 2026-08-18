function getLayoutRulesByDocumentType(documentType) {
  switch (documentType) {
    case "report":
      return {
        documentType,
        controlWord: "ПРОШУ",
        controlKey: "proshu",
      };

    case "order":
      return {
        documentType,
        controlWord: "НАКАЗУЮ",
        controlKey: "nakazuiu",
      };

    default:
      return {
        documentType,
        controlWord: null,
        controlKey: "controlWord",
      };
  }
}

module.exports = getLayoutRulesByDocumentType;
