// const buildLostProperty = (items = []) => {
//   return items
//     .map((item) => {
//       const parts = [];

//       parts.push(`- ${item.itemName}`);

//       if (item.identification?.trim()) {
//         parts.push(item.identification.trim());
//       }

//       if (item.manufactureYear?.trim()) {
//         parts.push(`${item.manufactureYear.trim()} року випуску`);
//       }

//       return `${parts.join(", ")} — в кількості ${item.quantity}.`;
//     })
//     .join("\n");
// };

// module.exports = buildLostProperty;
