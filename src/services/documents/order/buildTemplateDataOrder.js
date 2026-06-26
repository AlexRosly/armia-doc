// const buildPropertyGroups = require("./buildPropertyGroups");

// const buildTemplateDataOrder = (payload, profile = {}) => {
//   const data = payload.data;
//   // const signerDate = new Date(data.signer.date).toLocaleDateString("uk-UA"); //23.03.26
//   const signerDate = new Date(data.signer.date).toLocaleDateString("uk-UA", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   }); //23 березня 2026 р.
//   return {
//     recipient: data.documentDetails.recipient,

//     documentTitle: data.documentDetails.documentTitle,

//     eventDescription: data.eventDescription.text,

//     // services: buildPropertyGroups(data.lostProperty),
//     services: buildPropertyGroups(data.lostProperty),
//     specialPropertyCases: data.specialPropertyCases?.text || "",
//     confirmationAndGrounds: data.confirmationAndGrounds?.text || "",

//     requestPart: data.requestPart.text,

//     signerPosition: data.signer.position,

//     signerMilitaryUnit: data.signer.militaryUnit,

//     signerRank: data.signer.rank,

//     signerFullName: data.signer.fullName,

//     signerDate: signerDate,
//   };
// };

// module.exports = buildTemplateDataOrder;

//2-й вариант

// const buildPropertyGroups = require("./buildPropertyGroups");

// const buildTemplateDataOrder = (payload) => {
//   const data = payload.data;
//   const legalApproval = payload.approvalAndVisa?.legalApproval || {};

//   const approvals = payload.approvalAndVisa?.approvals || [];
//   console.log("legalApproval:", legalApproval);
//   console.log("approvals:", approvals);

//   return {
//     whoseOrder: data.orderDetails.whoseOrder,

//     settlement: data.orderDetails.settlement,

//     orderDate: data.orderDetails.orderDate,

//     orderTitle: data.orderDetails.orderTitle,

//     eventDescription: data.eventDescription?.text || "",

//     services: buildPropertyGroups(data.lostProperty),

//     eventConfirmation: data.eventConfirmation?.text || "",

//     directiveSection: data.directiveSection?.text || "",

//     signerPosition: data.signer?.position || "",
//     signerMilitaryUnit: data.signer?.militaryUnit || "",
//     signerRank: data.signer?.rank || "",

//     signerFirstName: data.signer?.firstName || "",

//     signerLastName: data.signer?.lastName || "",
//     approvals: approvals?.approvals || [],
//     legalApproval: legalApproval?.position || "",
//     orderPreparedBy: data.orderPreparedBy?.position || "",
//   };
// };

// module.exports = buildTemplateDataOrder;

// 3-й
// const buildPropertyGroups = require("./buildPropertyGroups");

// const buildTemplateDataOrder = (payload) => {
//   const data = payload.data;

//   const approvalAndVisa = payload.approvalAndVisa || {};
//   console.log({ approvalAndVisa });

//   return {
//     whoseOrder: data.orderDetails?.whoseOrder || "",

//     settlement: data.orderDetails?.settlement || "",

//     orderDate: data.orderDetails?.orderDate || "",

//     orderTitle: data.orderDetails?.orderTitle || "",

//     eventDescription: data.eventDescription?.text || "",

//     services: buildPropertyGroups(data.lostProperty),

//     eventConfirmation: data.eventConfirmation?.text || "",

//     directiveSection: data.directiveSection?.text || "",

//     //
//     // signer
//     //

//     signerPosition: data.signer?.position || "",

//     signerMilitaryUnit: data.signer?.militaryUnit || "",

//     signerRank: data.signer?.rank || "",

//     signerFirstName: data.signer?.firstName || "",

//     signerLastName: data.signer?.lastName || "",

//     //
//     // approvals (массив)
//     //

//     approvals: approvals || [],

//     //
//     // legalApproval (один человек)
//     //

//     legalApproval: approvalAndVisa.legalApproval || {},

//     //
//     // orderPreparedBy (один человек)
//     //

//     orderPreparedBy: approvalAndVisa.orderPreparedBy || {},
//   };
// };

// module.exports = buildTemplateDataOrder;
//4-й
// const buildPropertyGroups = require("./buildPropertyGroups");

// const buildTemplateDataOrder = (payload) => {
//   const data = payload.data;

//   const approvalAndVisa = payload.approvalAndVisa || {};

//   console.log("approvalAndVisa:", approvalAndVisa);

//   return {
//     whoseOrder: data.orderDetails?.whoseOrder || "",

//     settlement: data.orderDetails?.settlement || "",

//     orderDate: data.orderDetails?.orderDate || "",

//     orderTitle: data.orderDetails?.orderTitle || "",

//     eventDescription: data.eventDescription?.text || "",

//     services: buildPropertyGroups(data.lostProperty),

//     eventConfirmation: data.eventConfirmation?.text || "",

//     directiveSection: data.directiveSection?.text || "",

//     signerPosition: data.signer?.position || "",

//     signerMilitaryUnit: data.signer?.militaryUnit || "",

//     signerRank: data.signer?.rank || "",

//     signerFirstName: data.signer?.firstName || "",

//     signerLastName: data.signer?.lastName || "",

//     approvals: approvalAndVisa.approvals || [],
//     legalApproval: approvalAndVisa.legalApproval || {},
//     orderPreparedBy: approvalAndVisa.orderPreparedBy || {},
//   };
// };

//5-й
// const buildPropertyGroups = require("./buildPropertyGroups");

// const buildTemplateDataOrder = (payload) => {
//   const data = payload.data || {};
//   const approvalAndVisa = payload.approvalAndVisa || {};

//   return {
//     whoseOrder: data.orderDetails?.whoseOrder || "",
//     settlement: data.orderDetails?.settlement || "",
//     orderDate: data.orderDetails?.orderDate || "",
//     orderTitle: data.orderDetails?.orderTitle || "",

//     eventDescription: data.eventDescription?.text || "",
//     services: buildPropertyGroups(data.lostProperty || []),
//     eventConfirmation: data.eventConfirmation?.text || "",
//     directiveSection: data.directiveSection?.text || "",

//     signerPosition: data.signer?.position || "",
//     signerMilitaryUnit: data.signer?.militaryUnit || "",
//     signerRank: data.signer?.rank || "",
//     signerFirstName: data.signer?.firstName || "",
//     signerLastName: data.signer?.lastName || "",

//     approvals: (approvalAndVisa.approvals || []).map((item) => ({
//       position: item.position || "",
//       rank: item.rank || "",
//       firstName: item.firstName || "",
//       lastName: item.lastName || "",
//       approvalDate: {
//         day: item.approvalDate?.day || "",
//         month: item.approvalDate?.month || "",
//         year: item.approvalDate?.year || "",
//       },
//       approvalDay: item.approvalDate?.day || "",
//       approvalMonth: item.approvalDate?.month || "",
//       approvalYear: item.approvalDate?.year || "",
//     })),

//     legalApproval: {
//       position: approvalAndVisa.legalApproval?.position || "",
//       rank: approvalAndVisa.legalApproval?.rank || "",
//       firstName: approvalAndVisa.legalApproval?.firstName || "",
//       lastName: approvalAndVisa.legalApproval?.lastName || "",
//       approvalDate: {
//         day: approvalAndVisa.legalApproval?.approvalDate?.day || "",
//         month: approvalAndVisa.legalApproval?.approvalDate?.month || "",
//         year: approvalAndVisa.legalApproval?.approvalDate?.year || "",
//       },
//       approvalDay: approvalAndVisa.legalApproval?.approvalDate?.day || "",
//       approvalMonth: approvalAndVisa.legalApproval?.approvalDate?.month || "",
//       approvalYear: approvalAndVisa.legalApproval?.approvalDate?.year || "",
//     },

//     orderPreparedBy: {
//       position: approvalAndVisa.orderPreparedBy?.position || "",
//       rank: approvalAndVisa.orderPreparedBy?.rank || "",
//       firstName: approvalAndVisa.orderPreparedBy?.firstName || "",
//       lastName: approvalAndVisa.orderPreparedBy?.lastName || "",
//       preparedDate: {
//         day: approvalAndVisa.orderPreparedBy?.preparedDate?.day || "",
//         month: approvalAndVisa.orderPreparedBy?.preparedDate?.month || "",
//         year: approvalAndVisa.orderPreparedBy?.preparedDate?.year || "",
//       },
//       preparedDay: approvalAndVisa.orderPreparedBy?.preparedDate?.day || "",
//       preparedMonth: approvalAndVisa.orderPreparedBy?.preparedDate?.month || "",
//       preparedYear: approvalAndVisa.orderPreparedBy?.preparedDate?.year || "",
//     },
//   };
// };

// // module.exports = buildTemplateDataOrder;
// module.exports = buildTemplateDataOrder;
// 6-й
// const buildPropertyGroups = require("./buildPropertyGroups");

// const buildTemplateDataOrder = (payload) => {
//   const data = payload.data || {};
//   const approvalAndVisa = payload.approvalAndVisa || {};
//   console.log(
//     "legalApproval:",
//     JSON.stringify(
//       {
//         position: approvalAndVisa.legalApproval?.position || "",
//         rank: approvalAndVisa.legalApproval?.rank || "",
//         firstName: approvalAndVisa.legalApproval?.firstName || "",
//         lastName: approvalAndVisa.legalApproval?.lastName || "",
//         approvalDay: approvalAndVisa.legalApproval?.approvalDate?.day || "",
//         approvalMonth: approvalAndVisa.legalApproval?.approvalDate?.month || "",
//         approvalYear: approvalAndVisa.legalApproval?.approvalDate?.year || "",
//       },
//       null,
//       2,
//     ),
//   );

//   console.log(
//     "orderPreparedBy:",
//     JSON.stringify(
//       {
//         position: approvalAndVisa.orderPreparedBy?.position || "",
//         rank: approvalAndVisa.orderPreparedBy?.rank || "",
//         firstName: approvalAndVisa.orderPreparedBy?.firstName || "",
//         lastName: approvalAndVisa.orderPreparedBy?.lastName || "",
//         preparedDay: approvalAndVisa.orderPreparedBy?.preparedDate?.day || "",
//         preparedMonth:
//           approvalAndVisa.orderPreparedBy?.preparedDate?.month || "",
//         preparedYear: approvalAndVisa.orderPreparedBy?.preparedDate?.year || "",
//       },
//       null,
//       2,
//     ),
//   );

//   return {
//     whoseOrder: data.orderDetails?.whoseOrder || "",
//     settlement: data.orderDetails?.settlement || "",
//     orderDate: data.orderDetails?.orderDate || "",
//     orderTitle: data.orderDetails?.orderTitle || "",

//     eventDescription: data.eventDescription?.text || "",
//     services: buildPropertyGroups(data.lostProperty || []),
//     eventConfirmation: data.eventConfirmation?.text || "",
//     directiveSection: data.directiveSection?.text || "",

//     signerPosition: data.signer?.position || "",
//     signerMilitaryUnit: data.signer?.militaryUnit || "",
//     signerRank: data.signer?.rank || "",
//     signerFirstName: data.signer?.firstName || "",
//     signerLastName: data.signer?.lastName || "",

//     approvals: (approvalAndVisa.approvals || []).map((item) => ({
//       position: item.position || "",
//       rank: item.rank || "",
//       firstName: item.firstName || "",
//       lastName: item.lastName || "",
//       approvalDay: item.approvalDate?.day || "",
//       approvalMonth: item.approvalDate?.month || "",
//       approvalYear: item.approvalDate?.year || "",
//     })),

//     legalApproval: {
//       position: approvalAndVisa.legalApproval?.position || "",
//       rank: approvalAndVisa.legalApproval?.rank || "",
//       firstName: approvalAndVisa.legalApproval?.firstName || "",
//       lastName: approvalAndVisa.legalApproval?.lastName || "",
//       approvalDay: approvalAndVisa.legalApproval?.approvalDate?.day || "",
//       approvalMonth: approvalAndVisa.legalApproval?.approvalDate?.month || "",
//       approvalYear: approvalAndVisa.legalApproval?.approvalDate?.year || "",
//     },

//     orderPreparedBy: {
//       position: approvalAndVisa.orderPreparedBy?.position || "",
//       rank: approvalAndVisa.orderPreparedBy?.rank || "",
//       firstName: approvalAndVisa.orderPreparedBy?.firstName || "",
//       lastName: approvalAndVisa.orderPreparedBy?.lastName || "",
//       preparedDay: approvalAndVisa.orderPreparedBy?.preparedDate?.day || "",
//       preparedMonth: approvalAndVisa.orderPreparedBy?.preparedDate?.month || "",
//       preparedYear: approvalAndVisa.orderPreparedBy?.preparedDate?.year || "",
//     },
//   };
// };

// module.exports = buildTemplateDataOrder;
//7-й
const buildPropertyGroups = require("./buildPropertyGroups");

const buildTemplateDataOrder = (payload) => {
  const data = payload.data || {};
  const approvalAndVisa = payload.approvalAndVisa || {};

  const templateData = {
    whoseOrder: data.orderDetails?.whoseOrder || "",
    settlement: data.orderDetails?.settlement || "",
    orderDate: data.orderDetails?.orderDate || "",
    orderTitle: data.orderDetails?.orderTitle || "",

    eventDescription: data.eventDescription?.text || "",
    services: buildPropertyGroups(data.lostProperty || []),
    eventConfirmation: data.eventConfirmation?.text || "",
    directiveSection: data.directiveSection?.text || "",

    signerPosition: data.signer?.position || "",
    signerRank: data.signer?.rank || "",
    signerFirstName: data.signer?.firstName || "",
    signerLastName: data.signer?.lastName || "",

    approvals: (approvalAndVisa.approvals || []).map((item) => ({
      position: item.position || "",
      rank: item.rank || "",
      firstName: item.firstName || "",
      lastName: item.lastName || "",
      approvalDay: item.approvalDate?.day || "___",
      approvalMonth: item.approvalDate?.month || "___",
      approvalYear: item.approvalDate?.year || "___",
    })),

    legalApprovalPosition: approvalAndVisa.legalApproval?.position || "",
    legalApprovalRank: approvalAndVisa.legalApproval?.rank || "",
    legalApprovalFirstName: approvalAndVisa.legalApproval?.firstName || "",
    legalApprovalLastName: approvalAndVisa.legalApproval?.lastName || "",
    legalApprovalDay: approvalAndVisa.legalApproval?.approvalDate?.day || "___",
    legalApprovalMonth:
      approvalAndVisa.legalApproval?.approvalDate?.month || "___",
    legalApprovalYear: approvalAndVisa.legalApproval?.approvalDate?.year || "",

    orderPreparedByPosition: approvalAndVisa.orderPreparedBy?.position || "",
    orderPreparedByRank: approvalAndVisa.orderPreparedBy?.rank || "",
    orderPreparedByFirstName: approvalAndVisa.orderPreparedBy?.firstName || "",
    orderPreparedByLastName: approvalAndVisa.orderPreparedBy?.lastName || "",
    orderPreparedByDay:
      approvalAndVisa.orderPreparedBy?.preparedDate?.day || "___",
    orderPreparedByMonth:
      approvalAndVisa.orderPreparedBy?.preparedDate?.month || "___",
    orderPreparedByYear:
      approvalAndVisa.orderPreparedBy?.preparedDate?.year || "",
  };

  return templateData;
};

module.exports = buildTemplateDataOrder;
