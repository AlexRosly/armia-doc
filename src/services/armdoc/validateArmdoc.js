// const allowedAlgorithms = ["aes-256-gcm"];

// const allowedCompression = ["gzip"];

// const allowedDocumentTypes = ["report", "order", "act"];

// const requiredFields = [
//   "format",
//   "version",
//   "algorithm",
//   "compression",
//   "documentType",
//   "iv",
//   "authTag",
//   "data",
// ];

// const validateArmdoc = (payload) => {
//   if (!payload || typeof payload !== "object") {
//     throw new Error("Invalid ARMDOC.");
//   }

//   if (payload.format !== "ARMDOC") {
//     throw new Error("Unsupported file.");
//   }

//   if (payload.version !== 1) {
//     throw new Error("Unsupported version.");
//   }

//   if (!allowedAlgorithms.includes(payload.algorithm)) {
//     throw new Error("Unsupported algorithm.");
//   }

//   if (!allowedCompression.includes(payload.compression)) {
//     throw new Error("Unsupported compression.");
//   }

//   if (!allowedDocumentTypes.includes(payload.documentType)) {
//     throw new Error("Unsupported document type.");
//   }

//   for (const field of requiredFields) {
//     if (!(field in payload)) {
//       throw new Error(`${field} is missing.`);
//     }
//   }

//   return true;
// };

// module.exports = validateArmdoc;
// const allowedAlgorithms = ["aes-256-gcm"];

// const allowedCompression = ["gzip"];

// const allowedDocumentTypes = ["report", "order", "act"];

// const isBase64 = (str) => {
//   try {
//     return Buffer.from(str, "base64").toString("base64") === str;
//   } catch {
//     return false;
//   }
// };

// const validateArmdoc = (payload) => {
//   if (!payload || typeof payload !== "object") {
//     throw new Error("Invalid ARMDOC.");
//   }

//   if (payload.format !== "ARMDOC") {
//     throw new Error("Unsupported format.");
//   }

//   if (payload.version !== 1) {
//     throw new Error("Unsupported version.");
//   }

//   if (!allowedAlgorithms.includes(payload.algorithm)) {
//     throw new Error("Unsupported algorithm.");
//   }

//   if (!allowedCompression.includes(payload.compression)) {
//     throw new Error("Unsupported compression.");
//   }

//   if (!allowedDocumentTypes.includes(payload.documentType)) {
//     throw new Error("Unsupported document.");
//   }

//   const requiredFields = ["iv", "authTag", "data"];

//   for (const field of requiredFields) {
//     if (!(field in payload)) {
//       throw new Error(`${field} is missing.`);
//     }
//   }

//   if (!isBase64(payload.iv)) {
//     throw new Error("Invalid iv.");
//   }

//   if (!isBase64(payload.authTag)) {
//     throw new Error("Invalid authTag.");
//   }

//   if (!isBase64(payload.data)) {
//     throw new Error("Invalid encrypted data.");
//   }

//   return true;
// };

// module.exports = validateArmdoc;
const allowedAlgorithms = new Set(["aes-256-gcm"]);
const allowedCompression = new Set(["gzip"]);
const allowedDocumentTypes = new Set(["report", "order", "act"]);

const isBase64 = (str) => {
  try {
    return Buffer.from(str, "base64").toString("base64") === str;
  } catch {
    return false;
  }
};

const validateArmdoc = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid ARMDOC.");
  }

  if (payload.format !== "ARMDOC") {
    throw new Error("Unsupported format.");
  }

  if (payload.version !== 1) {
    throw new Error("Unsupported version.");
  }

  if (!allowedAlgorithms.has(payload.algorithm)) {
    throw new Error("Unsupported algorithm.");
  }

  if (!allowedCompression.has(payload.compression)) {
    throw new Error("Unsupported compression.");
  }

  if (!allowedDocumentTypes.has(payload.documentType)) {
    throw new Error("Unsupported document.");
  }

  for (const field of ["iv", "authTag", "data"]) {
    if (!(field in payload)) {
      throw new Error(`${field} is missing.`);
    }
  }

  if (!isBase64(payload.iv)) {
    throw new Error("Invalid iv.");
  }

  if (!isBase64(payload.authTag)) {
    throw new Error("Invalid authTag.");
  }

  if (!isBase64(payload.data)) {
    throw new Error("Invalid encrypted data.");
  }

  return true;
};

module.exports = validateArmdoc;
