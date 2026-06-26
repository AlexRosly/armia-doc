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

        // cost: property.cost?.value || "",

        // costSum: property.cost?.sum || 0,

        // currency: property.cost?.currency || "грн",
      })),
    })),
  }));
};

module.exports = buildPropertyGroups;
