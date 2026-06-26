const buildPropertyText = (property) => {
  const parts = [];

  parts.push(property.itemName);

  if (property.manufactureYear?.trim()) {
    parts.push(`${property.manufactureYear} року випуску`);
  }

  return `${parts.join(", ")} — в кількості ${
    property.quantity
  } ${property.unitOfMeasurement}.`;
};

module.exports = buildPropertyText;
