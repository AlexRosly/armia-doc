const actMasters = require("./actMasters");

const resolveActLayoutProfile = (payload) => {
  const layoutProfile = payload?.templateType;

  if (!layoutProfile) {
    throw new Error("payload.templateType is required for act generation");
  }

  if (!actMasters[layoutProfile]) {
    throw new Error(`Unknown act templateType/layoutProfile: ${layoutProfile}`);
  }

  return layoutProfile;
};

module.exports = resolveActLayoutProfile;
