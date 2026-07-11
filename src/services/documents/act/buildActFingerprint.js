const safeLen = (value) =>
  typeof value === "string" ? value.trim().length : 0;

const bucket = (value, limits) => {
  for (const [min, max, label] of limits) {
    if (value >= min && value <= max) return label;
  }

  return "overflow";
};

const countPropertyRows = (lostProperty = []) =>
  lostProperty.reduce((sum, serviceGroup) => {
    const rows = Array.isArray(serviceGroup?.listOfProperty)
      ? serviceGroup.listOfProperty.length
      : 0;

    return sum + rows;
  }, 0);

const buildActFingerprint = (payload, layoutProfile) => {
  const data = payload?.data || {};

  const propertyRows = countPropertyRows(data.lostProperty);
  const serviceCount = Array.isArray(data.lostProperty)
    ? data.lostProperty.length
    : 0;

  const eventTextLength =
    safeLen(data?.eventDescription?.text) +
    safeLen(data?.eventConfirmation?.text) +
    safeLen(data?.commissionConclusion) +
    safeLen(data?.commanderConclusion?.text);

  return {
    layoutProfile,
    propertyRowsBucket: bucket(propertyRows, [
      [0, 10, "0-10"],
      [11, 25, "11-25"],
      [26, 50, "26-50"],
      [51, 100, "51-100"],
    ]),
    serviceCountBucket: bucket(serviceCount, [
      [0, 1, "1"],
      [2, 3, "2-3"],
      [4, 6, "4-6"],
      [7, 20, "7+"],
    ]),
    eventTextBucket: bucket(eventTextLength, [
      [0, 500, "0-500"],
      [501, 1500, "501-1500"],
      [1501, 3000, "1501-3000"],
      [3001, 6000, "3001-6000"],
    ]),
    commissionMembersCount: Array.isArray(data?.commission?.members)
      ? data.commission.members.length
      : 0,
    witnessesCount: Array.isArray(data?.eventWitnesses)
      ? data.eventWitnesses.length
      : 0,
    serviceChiefsCount: Array.isArray(data?.supplyServiceChiefs)
      ? data.supplyServiceChiefs.length
      : 0,
    actCopiesCount: Number(data?.actCopies?.count || 0),
    hasCommanderConclusion: Boolean(data?.commanderConclusion?.text),
  };
};

module.exports = buildActFingerprint;
