const buildPropertyGroups = require("./buildPropertyGroups");

const buildTemplateDataAct = (payload) => {
  const data = payload.data;

  return {
    //
    // approval
    //

    copyNumber: data.approval?.copyNumber || "",

    approvalPosition: data.approval?.position || "",

    approvalRank: data.approval?.rank || "",

    approvalFirstName: data.approval?.firstName || "",

    approvalLastName: data.approval?.lastName || "",

    approvalDay: data.approval?.approvalDate?.day || "___",

    approvalMonth: data.approval?.approvalDate?.month || "___",

    approvalYear: data.approval?.approvalDate?.year || "",

    //
    // accounting
    //

    operationBasis: data.accountingDetails?.operationBasis || "",

    militaryUnit: data.accountingDetails?.militaryUnit || "",

    //
    // property
    //

    services: buildPropertyGroups(data.lostProperty),

    //
    // texts
    //

    eventDescription: data.eventDescription?.text || "",

    eventConfirmation: data.eventConfirmation?.text || "",

    commissionConclusion: data.commissionConclusion || "",

    //
    // commission
    //

    chairmanPosition: data.commission?.chairman?.position || "",

    chairmanRank: data.commission?.chairman?.rank || "",

    chairmanFirstName: data.commission?.chairman?.firstName || "",

    chairmanLastName: data.commission?.chairman?.lastName || "",

    commissionMembers: data.commission?.members || [],

    //
    // witnesses
    //

    eventWitnesses: data.eventWitnesses || [],

    //
    // chiefs
    //

    supplyServiceChiefs: data.supplyServiceChiefs || [],

    //
    // copies
    //

    copiesCount: data.actCopies?.count || "",

    copies: data.actCopies?.copies || [],

    //
    // commander
    //

    commanderText: data.commanderConclusion?.text || "",

    commanderPosition: data.commanderConclusion?.position || "",

    commanderRank: data.commanderConclusion?.rank || "",

    commanderFirstName: data.commanderConclusion?.firstName || "",

    commanderLastName: data.commanderConclusion?.lastName || "",

    commanderDay: data.commanderConclusion?.signatureDate?.day || "___",

    commanderMonth: data.commanderConclusion?.signatureDate?.month || "___",

    commanderYear: data.commanderConclusion?.signatureDate?.year || "",
  };
};

module.exports = buildTemplateDataAct;
