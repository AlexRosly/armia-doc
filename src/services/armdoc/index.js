const generateArmdoc = require("./generateArmdoc");
const decrypt = require("./decrypt");
const encrypt = require("./encrypt");
const loadArmdoc = require("./loadArmdoc");
const validateDocument = require("./validateDocument");
const validateArmdoc = require("./validateArmdoc");
const readArmdoc = require("./readArmdoc");

module.exports = {
  encrypt,
  decrypt,
  generateArmdoc,
  readArmdoc,
  loadArmdoc,
  validateArmdoc,
  validateDocument,
};
