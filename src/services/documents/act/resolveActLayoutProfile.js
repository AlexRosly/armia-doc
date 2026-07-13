const ALLOWED_LAYOUT_PROFILES = new Set([
  "ACT_LANDSCAPE_V1",
  "ACT_LANDSCAPE_V2",
]);

const resolveActLayoutProfile = (payload = {}) => {
  const candidate = payload.layoutProfile || payload.templateType;

  if (!candidate) {
    throw new Error(
      "Act payload.layoutProfile or payload.templateType is required",
    );
  }

  if (!ALLOWED_LAYOUT_PROFILES.has(candidate)) {
    throw new Error(`Unknown act templateType/layoutProfile: ${candidate}`);
  }

  return candidate;
};

module.exports = resolveActLayoutProfile;
