const report = require("./report");
const order = require("./order");
const act = require("./act");
const check = require("./checkStatus");
const download = require("./download");
const importDoc = require("./import");
const generation = require("./generation");
const generationEvents = require("./generationEvents");

module.exports = {
  report,
  download,
  order,
  act,
  importDoc,
  generation,
  check,
  generationEvents,
};
