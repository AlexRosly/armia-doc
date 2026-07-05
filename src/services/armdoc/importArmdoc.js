const fs = require("fs/promises");

const validateArmdoc = require("./validateArmdoc");
const decrypt = require("./decrypt");

const importArmdoc = async (filePath) => {
  const file = await fs.readFile(filePath, "utf8");

  let payload;

  try {
    payload = JSON.parse(file);
  } catch {
    throw new Error("Invalid ARMDOC.");
  }

  validateArmdoc(payload);

  return decrypt(payload);
};

module.exports = importArmdoc;
