// const { buildPropertyText } = require("../shared");

// const buildPropertyGroups = (lostProperty = []) => {
//   return lostProperty.map((service) => ({
//     service: service.service,

//     subDivisions: service.subDivisions.map((subDivision) => ({
//       subDivision: subDivision.subDivision,

//       items: subDivision.listOfProperty.map((property, index, array) => ({
//         text:
//           buildPropertyText(property) +
//           (index === array.length - 1 ? "." : ";"),

//         cost: property.cost?.value || "",
//       })),
//     })),
//   }));
// };

// module.exports = buildPropertyGroups;

// const { buildPropertyText } = require("../shared");

// const buildPropertyGroups = (lostProperty = []) => {
//   return lostProperty.map((service) => ({
//     service: service.service,

//     subDivisions: service.subDivisions.map((subDivision) => ({
//       subDivision: subDivision.subDivision,

//       items: subDivision.listOfProperty.map((property, index, array) => ({
//         text:
//           buildPropertyText(property) +
//           (index === array.length - 1 ? "." : ";"),
//       })),
//     })),
//   }));
// };
const { buildPropertyText } = require("../shared");

const stripEndingPunctuation = (value = "") =>
  String(value)
    .replace(/[.;:,]+$/g, "")
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

            const baseText = stripEndingPunctuation(
              buildPropertyText(property),
            );
            const ending = globalItemIndex === totalItemsCount ? "." : ";";

            return {
              text: `${baseText}${ending}`,
            };
          }),
        };
      }),
    };
  });
};

module.exports = buildPropertyGroups;
