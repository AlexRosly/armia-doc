// const decrypt = require("./decrypt");
// const validateArmdoc = require("./validateArmdoc");
// const validateDocument = require("./validateDocument");
// // const { armdoc: ctrl } = require("../../services");

// const allowedMime = ["application/octet-stream", "application/x-armdoc"];
// // Вот сюда и добавляются шаги

// // ✅ MIME

// // ✅ JSON

// const importArmdoc = (file) => {
//   //
//   // MIME
//   //

//   if (!allowedMime.includes(file.mimetype)) {
//     throw new Error("Invalid MIME type.");
//   }

//   //
//   // JSON
//   //

//   let payload;

//   try {
//     payload = JSON.parse(file.buffer.toString("utf8"));
//   } catch {
//     throw new Error("Invalid JSON.");
//   }

//   //
//   // HEADER
//   //

//   validateArmdoc(payload);

//   //
//   // DECRYPT
//   //

//   const document = decrypt(payload);

//   //
//   // DOCUMENT
//   //

//   validateDocument(document);

//   return document;
// };

// module.exports = importArmdoc;
const decrypt = require("./decrypt");
const validateArmdoc = require("./validateArmdoc");
const validateDocument = require("./validateDocument");

const ALLOWED_MIME = new Set([
  "application/octet-stream",
  "application/x-armdoc",
]);

const readArmdoc = (file) => {
  if (!file) {
    throw new Error("ARMDOC file is required.");
  }

  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new Error("Invalid MIME type.");
  }

  let payload;

  try {
    payload = JSON.parse(file.buffer.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON.");
  }

  validateArmdoc(payload);

  const document = decrypt(payload);

  validateDocument(document);

  return document;
};

module.exports = readArmdoc;
