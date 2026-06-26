const { buildPropertyText } = require("../shared");

const buildPropertyGroups = (lostProperty = []) => {
  return lostProperty.map((service) => ({
    service: service.service,

    items: service.listOfProperty.map((property) => ({
      text: buildPropertyText(property),

      category: property.category || "",

      technicalCondition: property.technicalCondition || "",

      writeOffValue: property.writeOffValue?.amountUah || "",

      note: property.note || "",
    })),
  }));
};

module.exports = buildPropertyGroups;
