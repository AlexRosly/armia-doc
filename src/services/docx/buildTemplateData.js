// const buildLostProperty = require("./buildLostProperty");

// const buildTemplateData = (payload) => {
//   const data = payload.data;

//   return {
//     recipient: data.documentDetails.recipient,

//     documentTitle: data.documentDetails.documentTitle,

//     eventDescription: data.eventDescription.text,

//     lostProperty: buildLostProperty(data.lostProperty),

//     specialPropertyCases: data.specialPropertyCases?.text || "",

//     valuationAndGrounds: data.valuationAndGrounds?.text || "",

//     lossCircumstances: data.lossCircumstances?.text || "",

//     additionalInfo: data.additionalInfo?.text || "",

//     requestPart: data.requestPart.text,

//     signerPosition: data.signer.position,

//     signerMilitaryUnit: data.signer.militaryUnit,

//     signerRank: data.signer.rank,

//     signerFullName: data.signer.fullName,

//     signerDate: data.signer.date,
//   };
// };

// module.exports = buildTemplateData;

const buildPropertyGroups = require("./buildPropertyGroups");

const buildTemplateData = (payload, profile = {}) => {
  const data = payload.data;
  // const signerDate = new Date(data.signer.date).toLocaleDateString("uk-UA"); //23.03.26
  const signerDate = new Date(data.signer.date).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    // month: "long",
    year: "numeric",
  }); //23 березня 2026 р.
  return {
    recipient: data.documentDetails.recipient,

    documentTitle: data.documentDetails.documentTitle,

    eventDescription: data.eventDescription.text,

    // services: buildPropertyGroups(data.lostProperty),
    services: buildPropertyGroups(data.lostProperty),
    specialPropertyCases: data.specialPropertyCases?.text || "",
    confirmationAndGrounds: data.confirmationAndGrounds?.text || "",

    requestPart: data.requestPart.text,

    signerPosition: data.signer.position,

    signerMilitaryUnit: data.signer.militaryUnit,

    signerRank: data.signer.rank,

    signerFullName: data.signer.fullName,

    signerDate: signerDate,

    // profileFontSize: profile.fontSize || 14,

    // profileLineSpacing: profile.lineSpacing || 1,

    // profileTopMargin: profile.topMargin || 2,
  };
};

module.exports = buildTemplateData;
