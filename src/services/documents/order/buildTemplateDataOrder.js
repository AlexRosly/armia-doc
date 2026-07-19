const buildPropertyGroups = require("./buildPropertyGroups");

const buildTemplateDataOrder = (payload) => {
  const data = payload.data || {};
  const approvalAndVisa = payload.approvalAndVisa || {};

  const splitToParagraphs = (value = "") => {
    return String(value)
      .replace(/\\n/g, "\n")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  };

  const splitToParagraphsDirectiveSection = (value = "") => {
    return String(value)
      .replace(/\\r/g, "\r")
      .split("\r")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  };

  const templateData = {
    whoseOrder: data.orderDetails?.whoseOrder || "",
    settlement: data.orderDetails?.settlement || "",
    orderDate: data.orderDetails?.orderDate || "",
    orderTitle: data.orderDetails?.orderTitle || "",

    eventDescription: data.eventDescription?.text || "",
    services: buildPropertyGroups(data.lostProperty || []),
    eventConfirmation: splitToParagraphs(data.eventConfirmation?.text || ""),
    directiveSection: splitToParagraphsDirectiveSection(
      data.directiveSection?.text || "",
    ),

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
