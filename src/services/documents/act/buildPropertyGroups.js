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
      // totalResidualCostUah: property.cost.totalResidualCostUah || "",
      // grandTotalResidualCostUah: property.grandTotalResidualCostUah || "",
      primaryUnitCostUah: property.cost.primaryUnitCostUah || "",
      residualUnitCostUah: property.cost.residualUnitCostUah || "",
      // totalItemsCount: property.totalItemsCount || "",
      // manufactureYear: property.manufactureYear || "",
      // totalCostUah: property.cost.totalCostUah || "",
      currency: property.cost.currency || "",

      technicalCondition: property.technicalCondition || "",

      // writeOffValue: property.writeOffValue?.amountUah || "",

      note: property.note || "",
    })),
  }));
};

module.exports = buildPropertyGroups;
