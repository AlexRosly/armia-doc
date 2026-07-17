// const allowed = ["report", "order", "act"];

// const validateDocument = (document) => {
//   if (!document.caseId) {
//     throw new Error("caseId missing.");
//   }

//   if (!document.documentType) {
//     throw new Error("documentType missing.");
//   }

//   if (!allowed.includes(document.documentType)) {
//     throw new Error("Unknown document.");
//   }

//   if (!document.data) {
//     throw new Error("data missing.");
//   }

//   return true;
// };

// module.exports = validateDocument;
const allowed = new Set(["report", "order", "act"]);

const validateDocument = (document) => {
  if (!document || typeof document !== "object") {
    throw new Error("Invalid document.");
  }

  if (!document.caseId) {
    throw new Error("caseId missing.");
  }

  if (!document.documentType) {
    throw new Error("documentType missing.");
  }

  if (!allowed.has(document.documentType)) {
    throw new Error("Unknown document.");
  }

  return true;
};

module.exports = validateDocument;
