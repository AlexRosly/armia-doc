const allowed = ["report", "order", "act"];

const validateDocument = (document) => {
  if (!document.caseId) {
    throw new Error("caseId missing.");
  }

  if (!document.documentType) {
    throw new Error("documentType missing.");
  }

  if (!allowed.includes(document.documentType)) {
    throw new Error("Unknown document.");
  }

  if (!document.data) {
    throw new Error("data missing.");
  }

  return true;
};

module.exports = validateDocument;
