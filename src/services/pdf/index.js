const convertToPdf = require("./convertToPdf");

module.exports = {
  convertToPdf,
  convertManyToPdf: convertToPdf.convertManyToPdf,
};
