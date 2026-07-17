// const fs = require("fs/promises");

// const decrypt = require("./decrypt");

// const loadArmdoc = async (path) => {
//   const file = await fs.readFile(path, "utf8");

//   const payload = JSON.parse(file);

//   return decrypt(payload);
// };

// module.exports = loadArmdoc;
const fs = require("fs/promises");

const decrypt = require("./decrypt");
const validateArmdoc = require("./validateArmdoc");
const validateDocument = require("./validateDocument");

const loadArmdoc = async (filePath) => {
  const file = await fs.readFile(filePath, "utf8");

  let payload;

  try {
    payload = JSON.parse(file);
  } catch {
    throw new Error("Invalid ARMDOC JSON.");
  }

  validateArmdoc(payload);

  const document = decrypt(payload);

  validateDocument(document);

  return document;
};

module.exports = loadArmdoc;
