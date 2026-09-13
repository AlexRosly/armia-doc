const { buildPropertyText } = require("../shared");

const stripEndingSeparators = (value = "") =>
  String(value)
    .trimEnd()
    .replace(/[;:,]+$/g, "")
    .trim();

const buildPropertyGroups = (lostProperty = []) => {
  const services = Array.isArray(lostProperty) ? lostProperty : [];

  const totalItemsCount = services.reduce((total, service) => {
    const subDivisions = Array.isArray(service?.subDivisions)
      ? service.subDivisions
      : [];

    return (
      total +
      subDivisions.reduce((subTotal, subDivision) => {
        const listOfProperty = Array.isArray(subDivision?.listOfProperty)
          ? subDivision.listOfProperty
          : [];

        return subTotal + listOfProperty.length;
      }, 0)
    );
  }, 0);

  let globalItemIndex = 0;

  return services.map((service) => {
    const subDivisions = Array.isArray(service?.subDivisions)
      ? service.subDivisions
      : [];

    return {
      service: service?.service || "",
      subDivisions: subDivisions.map((subDivision) => {
        const listOfProperty = Array.isArray(subDivision?.listOfProperty)
          ? subDivision.listOfProperty
          : [];

        return {
          subDivision: subDivision?.subDivision || "",
          items: listOfProperty.map((property) => {
            globalItemIndex += 1;

            const baseText = stripEndingSeparators(
              buildPropertyText(property),
            );
            const ending = globalItemIndex === totalItemsCount ? "." : ";";

            return {
              text: `${ending === "." ? baseText.replace(/\.+$/, "") : baseText}${ending}`,
            };
          }),
        };
      }),
    };
  });
};

module.exports = buildPropertyGroups;
