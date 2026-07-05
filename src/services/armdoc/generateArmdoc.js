// const fs = require("fs/promises");

// const generateArmdoc = async (payload, filePath) => {
//   const content = JSON.stringify(payload);

//   await fs.writeFile(filePath, content);
// };

// module.exports = generateArmdoc;
const fs = require("fs/promises");

const encrypt = require("./encrypt");

const generateArmdoc = async (report, outputPath) => {
  const encrypted = encrypt(report);

  await fs.writeFile(outputPath, JSON.stringify(encrypted, null, 2), "utf8");
};

module.exports = generateArmdoc;
