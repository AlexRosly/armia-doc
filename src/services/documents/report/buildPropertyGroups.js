const { buildPropertyText } = require("../shared");

const buildPropertyGroups = (lostProperty = []) => {
  return lostProperty.map((service) => ({
    service: service.service,

    subDivisions: service.subDivisions.map((subDivision) => ({
      subDivision: subDivision.subDivision,

      items: subDivision.listOfProperty.map((property, index, array) => ({
        text:
          buildPropertyText(property) +
          (index === array.length - 1 ? "." : ";"),
      })),
    })),
  }));
};

module.exports = buildPropertyGroups;
