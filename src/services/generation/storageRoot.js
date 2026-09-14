const path = require("path");
module.exports = job => {
  const base = path.resolve(__dirname, "../../../storage");
  if (job?.lifecycleManaged) {
    const id = String(job._id);
    if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Invalid storage job ID");
    return path.join(base, "jobs", id);
  }
  return process.env.GENERATION_STORAGE_ROOT || base;
};
