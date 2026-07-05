const fs = require("fs/promises");

const decrypt = require("./decrypt");

const loadArmdoc = async (path) => {
  const file = await fs.readFile(path, "utf8");

  const payload = JSON.parse(file);

  return decrypt(payload);
};

module.exports = loadArmdoc;
