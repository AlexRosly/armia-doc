// const buildPropertyText = (item) => {
//   const parts = [];

// const { model } = require("mongoose");

//   parts.push(item.itemName);

//   if (item.identification?.trim()) {
//     parts.push(item.identification.trim());
//   }

//   if (item.manufactureYear?.trim()) {
//     parts.push(`${item.manufactureYear.trim()} року випуску`);
//   }

//   return `${parts.join(", ")} — в кількості ${item.quantity}.`;
// };

// const buildPropertyGroups = (lostProperty = []) => {
//   const groups = {};

//   for (const item of lostProperty) {
//     const service = item.service;

//     if (!groups[service]) {
//       groups[service] = [];
//     }

//     groups[service].push({ unit: item.unit, text: buildPropertyText(item) });
//   }

//   return Object.entries(groups).map(([service, items]) => ({
//     service,
//     items,
//   }));
// };
// const buildPropertyText = (property) => {
//   const parts = [];

//   parts.push(property.itemName);

//   if (property.manufactureYear?.trim()) {
//     parts.push(`${property.manufactureYear} року випуску`);
//   }

//   return `${parts.join(", ")} — в кількості ${
//     property.quantity
//   } ${property.unitOfMeasurement}.`;
// };

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

// const toUpperCase = () => {
//   const str = "мама";
//   const result = str[0].toUpperCase() + str.substring(1);
//   console.log(result); // "Мама"
// };

// // const buildPropertyGroups = (lostProperty = []) => {
//   return lostProperty.map((service) => ({
//     service: service.service,

//     subDivisions: service.subDivisions.map((subDivision) => ({
//       subDivision: subDivision.subDivision,

//       items: subDivision.listOfProperty.map((property) => ({
//         text: buildPropertyText(property),
//       })),
//     })),
//   }));
// };
// const buildPropertyGroups = (lostProperty = []) => {
//   console.dir(lostProperty, { depth: null });

//   return lostProperty.map((service) => ({
//     service: service.service,

//     subDivisions: service.subDivisions.map((subDivision) => {
//       console.log("SUBDIVISION:");
//       console.dir(subDivision, { depth: null });

//       return {
//         subDivision: subDivision.subDivision,

//         items: subDivision.listOfProperty.map((property) => ({
//           text: buildPropertyText(property),
//         })),
//       };
//     }),
//   }));
// };

// module.exports = buildPropertyText;
