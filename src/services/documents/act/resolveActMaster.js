const actMasters = require("./actMasters");

const resolveActMaster = (layoutProfile) => {
  const master = actMasters[layoutProfile];

  if (!master) {
    throw new Error(`Unknown act layoutProfile: ${layoutProfile}`);
  }

  return master;
};

module.exports = resolveActMaster;
