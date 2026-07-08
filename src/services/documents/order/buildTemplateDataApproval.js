const buildTemplateDataApproval = (payload) => {
  const data = payload.data || {};
  const approvalAndVisa = payload.approvalAndVisa || {};

  return {
    orderTitle: data.orderDetails?.orderTitle || "",
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
};

module.exports = buildTemplateDataApproval;
