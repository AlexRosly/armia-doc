// Linux-only managed execution: a new session/process group per job.
// Never use this helper with an arbitrary PID from a request or old database row.
const killGroup = pid => {
  if (!Number.isInteger(pid) || pid <= 1 || pid === process.pid) throw new Error("Unsafe process group");
  try { process.kill(-pid, "SIGKILL"); }
  catch (error) { if (error.code !== "ESRCH") throw error; }
};
const groupExists = pid => {
  try { process.kill(-pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
};
module.exports = { killGroup, groupExists };
