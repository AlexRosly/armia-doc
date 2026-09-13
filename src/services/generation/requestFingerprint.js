const { createHash } = require("crypto");

// Preserve array order, whitespace, punctuation and JSON scalar types.
// Sorting object keys makes transport key order irrelevant.
const canonical = value => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};

module.exports = payload => {
  // Convert Dates/ObjectIds to their wire representation. No payload is logged.
  const wire = JSON.parse(JSON.stringify(payload));
  // Server-managed root metadata does not affect generation; nested IDs do.
  for (const key of ["_id", "__v", "createdAt", "updatedAt"]) delete wire[key];
  return `v1:${createHash("sha256").update(canonical(wire)).digest("hex")}`;
};
