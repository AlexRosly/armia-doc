const decrypt = require("./decrypt");
const validateArmdoc = require("./validateArmdoc");
const validateDocument = require("./validateDocument");
// const { armdoc: ctrl } = require("../../services");

const allowedMime = ["application/octet-stream", "application/x-armdoc"];
// Вот сюда и добавляются шаги

// ✅ MIME

// ✅ JSON

const importArmdoc = (file) => {
  //
  // MIME
  //

  if (!allowedMime.includes(file.mimetype)) {
    throw new Error("Invalid MIME type.");
  }

  //
  // JSON
  //

  let payload;

  try {
    payload = JSON.parse(file.buffer.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON.");
  }

  //
  // HEADER
  //

  validateArmdoc(payload);

  //
  // DECRYPT
  //

  const document = decrypt(payload);

  //
  // DOCUMENT
  //

  validateDocument(document);

  return document;
};

module.exports = importArmdoc;
