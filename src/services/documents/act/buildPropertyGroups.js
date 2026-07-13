const { buildPropertyText } = require("../shared");

const buildPropertyGroups = (lostProperty = []) => {
  return lostProperty.map((service) => ({
    service: service.service,
    totalResidualCostUah: service.totalResidualCostUah,

    items: service.listOfProperty.map((property) => ({
      itemName: property.itemName || "",
      nomenclatureCode: property.nomenclatureCode || "",
      unitOfMeasurement: property.unitOfMeasurement || "",
      category: property.category || "",
      quantity: property.quantity || "",
      primaryUnitCostUah: property.cost.primaryUnitCostUah || "",
      residualUnitCostUah: property.cost.residualUnitCostUah || "",
      currency: property.cost.currency || "",

      technicalCondition: property.technicalCondition || "",
      note: property.note || "",
    })),
  }));
};

module.exports = buildPropertyGroups;
