const fs = require("fs/promises");

const generateArmdoc = async (payload, filePath) => {
  const content = JSON.stringify(payload);

  await fs.writeFile(filePath, content);
};

module.exports = generateArmdoc;
