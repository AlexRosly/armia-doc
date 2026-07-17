const buildPropertyGroups = require("./buildPropertyGroups");

const buildTemplateDataReport = (payload, profile = {}) => {
  const data = payload.data;
  // const signerDate = new Date(data.signer.date).toLocaleDateString("uk-UA"); //23.03.26
  const signerDate = new Date(data.signer.date).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    // month: "long",
    year: "numeric",
  }); //23.03.2026 р.
  const capitalizeFirstLetter = (value = "", locale = "uk-UA") => {
    const str = String(value).trim();
    if (!str) return "";

    const index = Array.from(str).findIndex((char) => /\p{L}/u.test(char));
    if (index === -1) return str;

    const chars = Array.from(str);
    chars[index] = chars[index].toLocaleUpperCase(locale);

    return chars.join("");
  };

  const splitToParagraphs = (value = "") => {
    return String(value)
      .replace(/\\n/g, "\n")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  };

  return {
    recipient: data.documentDetails.recipient,
    documentTitle: data.documentDetails.documentTitle,
    eventDescription: data.eventDescription.text,
    // services: buildPropertyGroups(data.lostProperty),
    services: buildPropertyGroups(data.lostProperty),
    specialPropertyCases: data.specialPropertyCases?.text || "",
    // confirmationAndGrounds: data.confirmationAndGrounds?.text || "",
    confirmationAndGrounds: splitToParagraphs(
      data.confirmationAndGrounds?.text || "",
    ),

    // requestPart: data.requestPart.text,
    requestPart: capitalizeFirstLetter(data.requestPart?.text || ""),
    signerPosition: data.signer.position,
    signerMilitaryUnit: data.signer.militaryUnit,
    signerRank: data.signer.rank,
    signerFullName: data.signer.fullName,
    signerDate: signerDate,
    // estimatedCost: payload.data.estimatedCost || "",
  };
};

module.exports = buildTemplateDataReport;
// const buildPropertyGroups = require("./buildPropertyGroups");

// const buildTemplateDataReport = (payload, profile = {}) => {
//   const data = payload.data;

//   const signerDate = new Date(data.signer.date).toLocaleDateString("uk-UA", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   });

//   const capitalizeFirstLetter = (value = "", locale = "uk-UA") => {
//     const str = String(value).trim();
//     if (!str) return "";

//     const index = Array.from(str).findIndex((char) => /\p{L}/u.test(char));
//     if (index === -1) return str;

//     const chars = Array.from(str);
//     chars[index] = chars[index].toLocaleUpperCase(locale);

//     return chars.join("");
//   };

//   const normalizeMultilineText = (value = "") => {
//     return String(value || "")
//       .replace(/\r\n/g, "\n")
//       .replace(/\\n/g, "\n")
//       .trim();
//   };

//   return {
//     recipient: data.documentDetails.recipient,
//     documentTitle: data.documentDetails?.documentTitle || "РАПОРТ",
//     eventDescription: data.eventDescription.text,
//     services: buildPropertyGroups(data.lostProperty),
//     specialPropertyCases: normalizeMultilineText(
//       data.specialPropertyCases?.text || "",
//     ),
//     confirmationAndGrounds: normalizeMultilineText(
//       data.confirmationAndGrounds?.text || "",
//     ),
//     requestPart: capitalizeFirstLetter(data.requestPart?.text || ""),
//     signerPosition: data.signer.position,
//     signerMilitaryUnit: data.signer.militaryUnit,
//     signerRank: data.signer.rank,
//     signerFullName: data.signer.fullName,
//     signerDate: signerDate,
//   };
// };

// module.exports = buildTemplateDataReport;
