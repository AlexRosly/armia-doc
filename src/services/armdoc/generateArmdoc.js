// const fs = require("fs/promises");

// const encrypt = require("./encrypt");

// const generateArmdoc = async (report, outputPath) => {
//   const encrypted = encrypt(report);

//   await fs.writeFile(outputPath, JSON.stringify(encrypted, null, 2), "utf8");
// };

// module.exports = generateArmdoc;
const fs = require("fs/promises");

const encrypt = require("./encrypt");

const generateArmdoc = async (document, outputPath) => {
  const encrypted = encrypt(document);

  await fs.writeFile(outputPath, JSON.stringify(encrypted, null, 2), "utf8");

  return outputPath;
};

module.exports = generateArmdoc;
