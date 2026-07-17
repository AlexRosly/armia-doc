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

// module.exports = buildPropertyGroups;
const { buildPropertyText } = require("../shared");

const stripEndingPunctuation = (value = "") => {
  return String(value)
    .replace(/[.;:,]+$/g, "")
    .trim();
};

const buildPropertyGroups = (lostProperty = []) => {
  return lostProperty.map((service) => ({
    service: service.service,

    subDivisions: service.subDivisions.map((subDivision) => ({
      subDivision: subDivision.subDivision,

      items: subDivision.listOfProperty.map((property, index, array) => {
        const baseText = stripEndingPunctuation(buildPropertyText(property));
        const ending = index === array.length - 1 ? "." : ";";

        return {
          text: `${baseText}${ending}`,
        };
      }),
    })),
  }));
};

module.exports = buildPropertyGroups;
