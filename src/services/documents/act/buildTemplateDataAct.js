const buildPropertyGroups = require("./buildPropertyGroups");

// const MONTHS_GENITIVE = [
//   "січня",
//   "лютого",
//   "березня",
//   "квітня",
//   "травня",
//   "червня",
//   "липня",
//   "серпня",
//   "вересня",
//   "жовтня",
//   "листопада",
//   "грудня",
// ];

// const toNumber = (value) => {
//   if (value === null || value === undefined || value === "") return 0;
//   if (typeof value === "number") return value;

//   const normalized = String(value).replace(/\s/g, "").replace(",", ".");
//   const parsed = Number(normalized);

//   return Number.isNaN(parsed) ? 0 : parsed;
// };

// const normalizeActNarrativeText = (value) =>
//   String(value ?? "")
//     .normalize("NFC")
//     .replace(/\r\n?/g, "\n")
//     .split("\n")
//     .map((line) => line.trim())
//     .filter(Boolean)
//     .join(" ")
//     .replace(/[\u00a0\t ]+/g, " ")
//     .replace(/([:;,.!?])(?=[\p{L}\p{N}])/gu, "$1 ")
//     .trim();

// const normalizeCommanderDate = (params = {}) => {
//   const dayRaw = String(params.day ?? "").trim();
//   const monthRaw = String(params.month ?? "").trim();
//   const yearRaw = String(params.year ?? "").trim();

//   const day =
//     dayRaw && Number(dayRaw) >= 1 && Number(dayRaw) <= 31
//       ? dayRaw.padStart(2, "0")
//       : "___";

//   let month = "__________";

//   if (monthRaw) {
//     const monthNumber = Number(monthRaw);

//     if (
//       Number.isInteger(monthNumber) &&
//       monthNumber >= 1 &&
//       monthNumber <= 12
//     ) {
//       month = MONTHS_GENITIVE[monthNumber - 1];
//     } else {
//       month = monthRaw;
//     }
//   }

//   const year = /^\d{4}$/.test(yearRaw) ? yearRaw : "____";

//   return {
//     commanderDay: day,
//     commanderMonth: month,
//     commanderYear: year,
//   };
// };

// const countPropertyPositions = (lostProperty = []) =>
//   lostProperty.reduce(
//     (sum, service) => sum + (service.listOfProperty || []).length,
//     0,
//   );

// const buildTemplateDataAct = (payload) => {
//   const data = payload.data || {};
//   const services = buildPropertyGroups(data.lostProperty || []);
//   const copiesCountNumber = toNumber(data.actCopies?.count);
//   const showCommanderConclusion = copiesCountNumber > 1;
//   const commanderConclusion = data.commanderConclusion || {};

//   const normalizeDate = normalizeCommanderDate(
//     commanderConclusion.signatureDate,
//   );

//   const totalItemsCount = countPropertyPositions(data.lostProperty || []);

//   return {
//     copyNumber: data.approval?.copyNumber || "",
//     approvalPosition: data.approval?.position || "",
//     approvalRank: data.approval?.rank || "",
//     approvalFirstName: data.approval?.firstName || "",
//     approvalLastName: data.approval?.lastName || "",
//     approvalDay: data.approval?.approvalDate?.day || "___",
//     approvalMonth: data.approval?.approvalDate?.month || "___",
//     approvalYear: data.approval?.approvalDate?.year || "",

//     operationBasis: data.accountingDetails?.operationBasis || "",
//     militaryUnit: data.accountingDetails?.militaryUnit || "",

//     services,
//     totalItemsCount,
//     grandTotalResidualCostUah:
//       data.writeOffValue?.grandTotalResidualCostUah || "",

//     eventDescription: normalizeActNarrativeText(data.eventDescription?.text),
//     eventConfirmation: normalizeActNarrativeText(data.eventConfirmation?.text),
//     commissionConclusion: normalizeActNarrativeText(data.commissionConclusion),

//     chairmanPosition: data.commission?.chairman?.position || "",
//     chairmanRank: data.commission?.chairman?.rank || "",
//     chairmanFirstName: data.commission?.chairman?.firstName || "",
//     chairmanLastName: data.commission?.chairman?.lastName || "",
//     commissionMembers: data.commission?.members || [],

//     eventWitnesses: data.eventWitnesses || [],
//     supplyServiceChiefs: data.supplyServiceChiefs || [],

//     copiesCount: data.actCopies?.count || "",
//     copies: data.actCopies?.copies || [],

//     showCommanderConclusion,

//     commanderText: normalizeActNarrativeText(commanderConclusion.text),
//     commanderPosition: commanderConclusion.position || "",
//     commanderRank: commanderConclusion.rank || "",
//     commanderFirstName: commanderConclusion.firstName || "",
//     commanderLastName: commanderConclusion.lastName || "",
//     commanderDay: normalizeDate?.commanderDay || "___",
//     commanderMonth: normalizeDate?.commanderMonth || "__________",
//     commanderYear: normalizeDate?.commanderYear || "____",
//   };
// };

// module.exports = buildTemplateDataAct;
const MONTHS_GENITIVE = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeActNarrativeText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[\u00a0\t ]+/g, " ")
    .replace(/([:;,.!?])(?=[\p{L}\p{N}])/gu, "$1 ")
    .trim();

const normalizeCommanderDate = (params = {}) => {
  const dayRaw = String(params.day ?? "").trim();
  const monthRaw = String(params.month ?? "").trim();
  const yearRaw = String(params.year ?? "").trim();

  const day =
    dayRaw && Number(dayRaw) >= 1 && Number(dayRaw) <= 31
      ? dayRaw.padStart(2, "0")
      : "___";

  let month = "__________";

  if (monthRaw) {
    const monthNumber = Number(monthRaw);

    if (
      Number.isInteger(monthNumber) &&
      monthNumber >= 1 &&
      monthNumber <= 12
    ) {
      month = MONTHS_GENITIVE[monthNumber - 1];
    } else {
      // Коли frontend уже передав назву місяця у родовому відмінку.
      month = monthRaw;
    }
  }

  const year = /^\d{4}$/.test(yearRaw) ? yearRaw : "____";

  return {
    commanderDay: day,
    commanderMonth: month,
    commanderYear: year,
  };
};

const countPropertyPositions = (lostProperty = []) =>
  lostProperty.reduce(
    (sum, service) => sum + (service.listOfProperty || []).length,
    0,
  );

const buildTemplateDataAct = (payload) => {
  const data = payload.data || {};
  const services = buildPropertyGroups(data.lostProperty || []);
  const copiesCountNumber = toNumber(data.actCopies?.count);
  const showCommanderConclusion = copiesCountNumber > 1;
  const commanderConclusion = data.commanderConclusion || {};

  const normalizeDate = normalizeCommanderDate(
    commanderConclusion.signatureDate,
  );

  const totalItemsCount = countPropertyPositions(data.lostProperty || []);

  return {
    copyNumber: data.approval?.copyNumber || "",
    approvalPosition: data.approval?.position || "",
    approvalRank: data.approval?.rank || "",
    approvalFirstName: data.approval?.firstName || "",
    approvalLastName: data.approval?.lastName || "",
    approvalDay: data.approval?.approvalDate?.day || "___",
    approvalMonth: data.approval?.approvalDate?.month || "___",
    approvalYear: data.approval?.approvalDate?.year || "",

    operationBasis: data.accountingDetails?.operationBasis || "",
    militaryUnit: data.accountingDetails?.militaryUnit || "",

    services,
    totalItemsCount,
    grandTotalResidualCostUah:
      data.writeOffValue?.grandTotalResidualCostUah || "",

    eventDescription: normalizeActNarrativeText(data.eventDescription?.text),
    eventConfirmation: normalizeActNarrativeText(data.eventConfirmation?.text),
    commissionConclusion: normalizeActNarrativeText(data.commissionConclusion),

    chairmanPosition: data.commission?.chairman?.position || "",
    chairmanRank: data.commission?.chairman?.rank || "",
    chairmanFirstName: data.commission?.chairman?.firstName || "",
    chairmanLastName: data.commission?.chairman?.lastName || "",
    commissionMembers: data.commission?.members || [],

    eventWitnesses: data.eventWitnesses || [],
    supplyServiceChiefs: data.supplyServiceChiefs || [],

    copiesCount: data.actCopies?.count || "",
    copies: data.actCopies?.copies || [],

    showCommanderConclusion,

    commanderText: normalizeActNarrativeText(commanderConclusion.text),
    commanderPosition: commanderConclusion.position || "",
    commanderRank: commanderConclusion.rank || "",
    commanderFirstName: commanderConclusion.firstName || "",
    commanderLastName: commanderConclusion.lastName || "",
    commanderDay: normalizeDate?.commanderDay || "___",
    commanderMonth: normalizeDate?.commanderMonth || "__________",
    commanderYear: normalizeDate?.commanderYear || "____",
  };
};

module.exports = buildTemplateDataAct;
