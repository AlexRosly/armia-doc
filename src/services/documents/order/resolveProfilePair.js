const profiles = require("./profiles");

const findRequiredProfile = (items, name, type) => {
  const found = items.find((item) => item.name === name);

  if (!found) {
    throw new Error(`${type} profile not found: ${name}`);
  }

  return found;
};

const resolveProfilePair = (profile) => {
  if (profile?.orderProfile?.template && profile?.approvalProfile?.template) {
    return {
      orderProfile: profile.orderProfile,
      approvalProfile: profile.approvalProfile,
    };
  }

  if (!profile?.orderProfileName) {
    throw new Error("orderProfileName is required for order generation");
  }

  if (!profile?.approvalProfileName) {
    throw new Error("approvalProfileName is required for order generation");
  }

  return {
    orderProfile: findRequiredProfile(
      profiles.orderProfiles,
      profile.orderProfileName,
      "Order",
    ),
    approvalProfile: findRequiredProfile(
      profiles.approvalProfiles,
      profile.approvalProfileName,
      "Approval",
    ),
  };
};

module.exports = resolveProfilePair;
