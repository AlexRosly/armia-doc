const fs = require("fs/promises");
const os = require("os");
const crypto = require("crypto");

const instanceId = crypto.randomUUID();

const readProcessStart = async (pid) => {
  const stat = await fs.readFile(`/proc/${pid}/stat`, "utf8");
  // comm (field 2) may contain spaces and parentheses; starttime is field 22.
  const fields = stat.slice(stat.lastIndexOf(")") + 2).trim().split(/\s+/);
  return { state: fields[0], start: fields[19] };
};

const readHostIdentity = async () => ({
  host: os.hostname(),
  machine: (await fs.readFile("/etc/machine-id", "utf8")).trim(),
  boot: (await fs.readFile("/proc/sys/kernel/random/boot_id", "utf8")).trim(),
  pidNamespace: await fs.readlink("/proc/self/ns/pid"),
});

const createExecutionOwner = async ({ forceInline = false } = {}) => {
  if (!forceInline && process.env.QUEUE_ENABLED !== "false") return { kind: "queue" };
  const owner = { kind: "inline", instanceId, pid: process.pid, uid: process.getuid?.() };
  try {
    Object.assign(owner, await readHostIdentity());
    owner.processStart = (await readProcessStart(process.pid)).start;
  } catch {
    // Unsupported OS/permissions: retain ownership, but never guess it is dead.
  }
  return owner;
};

const isInlineOwnerStopped = async (owner) => {
  if (owner?.kind !== "inline" || !owner.machine || !owner.boot ||
      !owner.pidNamespace || !owner.processStart || !Number.isInteger(owner.pid) || owner.pid <= 0) return false;
  if (owner.uid === undefined || owner.uid !== process.getuid?.()) return false;
  try {
    const local = await readHostIdentity();
    if (local.host !== owner.host || local.machine !== owner.machine) return false;
    if (local.boot !== owner.boot) return true;
    // A different container/PID namespace cannot safely inspect this owner.
    if (local.pidNamespace !== owner.pidNamespace) return false;
    try {
      const current = await readProcessStart(owner.pid);
      return current.start !== owner.processStart || ["Z", "X"].includes(current.state);
    } catch (error) {
      return error.code === "ENOENT" || error.code === "ESRCH";
    }
  } catch {
    return false;
  }
};

module.exports = { createExecutionOwner, isInlineOwnerStopped };
