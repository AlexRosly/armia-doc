const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { createRequire } = require("node:module");
function load(file, mocks, globals = {}) {
  const filename = path.resolve(__dirname, "..", file), module = { exports: {} }, real = createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports, require: name => Object.hasOwn(mocks, name) ? mocks[name] : real(name),
    process, Date, console, setInterval, clearInterval, ...globals,
  }, { filename });
  return module.exports;
}
// Logic tests simulate the supported platform only inside the VM.
// Never modify the real process.platform or weaken the production guard.
function registry(platform = "linux") {
  const records = new Map(), cancelled = [];
  const Request = {
    updateOne: async (filter, update) => {
      let record = records.get(filter._id);
      if (update.$setOnInsert) { if (!record) records.set(filter._id, { ...update.$setOnInsert }); return; }
      if (!record || record.closedAt || record.clientId !== filter.clientId) return { matchedCount: 0 };
      Object.assign(record, update.$set); return { matchedCount: 1 };
    },
    findById: async id => records.get(id),
    findOneAndUpdate: async (filter, update) => {
      const record = records.get(filter._id) || {};
      Object.assign(record, update.$set); records.set(filter._id, record); return record;
    },
    exists: async filter => [...records.values()].some(r => r.jobId === filter.jobId && !r.closedAt),
  };
  const api = load("src/services/generation/lifecycle/requests.js", {
    "../../../models/generationRequest": Request,
    "../../../models": { GenerationJob: { updateOne: async filter => cancelled.push(String(filter._id)) } },
    "./supervisor": { interrupt() {} },
  }, { process: { platform } });
  return { api, records, cancelled };
}
test("close before create rejects admission without storing source data", async () => {
  const { api, records, cancelled } = registry(), token = "a".repeat(64);
  await api.close(token);
  await assert.rejects(api.prepare(token, "client"), { code: "GENERATION_CANCELLED" });
  assert.equal(records.size, 1); assert.equal(cancelled.length, 0);
  assert.notEqual([...records.keys()][0], token);
});
test("close before transaction attach cannot create an untracked job", async () => {
  const { api } = registry(), token = "b".repeat(64);
  const id = await api.prepare(token, "client");
  await api.close(token);
  await assert.rejects(api.attach(id, { _id: "job", lifecycleManaged: true }, "client"), { code: "GENERATION_CANCELLED" });
});
test("one tab does not cancel a job still explicitly attached in another tab", async () => {
  const { api, cancelled } = registry();
  for (const token of ["c".repeat(64), "d".repeat(64)]) {
    await api.attach(await api.prepare(token, "client"), { _id: "job", lifecycleManaged: true }, "client");
  }
  await api.close("c".repeat(64)); assert.equal(cancelled.length, 0);
  await api.close("d".repeat(64)); assert.deepEqual(cancelled, ["job"]);
});
test("invalid tokens and cross-client reuse are rejected", async () => {
  const { api } = registry();
  await assert.rejects(api.close("job-id"), { code: "INVALID_GENERATION_TOKEN" });
  const token = "e".repeat(64); await api.prepare(token, "one");
  await assert.rejects(api.prepare(token, "two"), { code: "GENERATION_CANCELLED" });
});
for (const stopped of [false, true]) test(`cleanup waits for executor stopped=${stopped}`, async () => {
  const actions = [];
  const job = { _id: "6aa65bea0c6d3645ec88ee53", documentId: "source", documentType: "act", lifecycleManaged: true,
    cancelRequestedAt: new Date(), executorStoppedAt: stopped ? new Date() : null, execution: { launchId: "launch" } };
  const api = load("src/services/generation/lifecycle/cleanup.js", {
    "fs/promises": { rm: async root => actions.push(root) },
    "../../../models": { GenerationJob: { findById: async () => job, exists: async () => false,
      deleteOne: async () => actions.push("job") }, documentModels: { act: { deleteOne: async () => actions.push("source") } } },
    "../../../models/generationRequest": { updateMany: async () => actions.push("marker") },
    "../inlineExecutionOwner": { isInlineOwnerStopped: async () => false },
    "./processTree": { groupExists: () => true },
  });
  assert.equal(await api.cleanJob(job._id), stopped);
  assert.equal(actions.length, stopped ? 4 : 0);
  if (stopped) assert.equal(actions[0], path.resolve(__dirname, "..", "storage", "jobs", job._id));
});
test("ready result is fenced when cancellation wins during generation", async () => {
  let updates = 0; const events = [];
  const run = load("src/services/generation/runGenerationJob.js", {
    "fs/promises": { access: async () => {} }, "../armdoc": {},
    "../layout": { runProfiles: async () => ({ docxPath: "/tmp/a.docx", pdfPath: "/tmp/a.pdf", status: "passed" }) },
    "../../models": { GenerationJob: { findOneAndUpdate: async (filter, update) => {
      assert.equal(filter.cancelRequestedAt, null); updates++;
      return update.status === "processing" ? { status: "processing" } : null;
    } } },
    "../generationEvents": { publishGenerationEvent: async event => events.push(event) },
    "./buildGenerationJobPayload": () => assert.fail("cancelled job cannot publish ready"),
  });
  await run({ documentType: "report" }, { _id: "id", documentType: "report", mode: "docx_only" });
  assert.equal(updates, 2); assert.equal(events.some(e => e.status === "ready"), false);
});
test("Linux cancellation kills only its own process tree", { skip: process.platform !== "linux", timeout: 8000 }, async () => {
  const { fork } = require("node:child_process");
  const { once } = require("node:events");
  const { killGroup } = require("../src/services/generation/lifecycle/processTree");
  const fixture = path.join(__dirname, "fixtures/generation-process-tree.cjs");
  const a = fork(fixture, [], { detached: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
  const b = fork(fixture, [], { detached: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
  try {
    const [[first], [second]] = await Promise.all([once(a, "message"), once(b, "message")]);
    const exit = once(a, "exit"); killGroup(a.pid); await exit;
    let state = "";
    for (let i = 0; i < 40; i++) {
      try { const stat = fs.readFileSync(`/proc/${first.grandchild}/stat`, "utf8"); state = stat.slice(stat.lastIndexOf(")") + 2).split(" ")[0]; }
      catch (error) { if (error.code === "ENOENT") { state = "gone"; break; } throw error; }
      if (["Z", "X"].includes(state)) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.ok(["gone", "Z", "X"].includes(state), `descendant still running: ${state}`);
    process.kill(b.pid, 0); process.kill(second.grandchild, 0);
    assert.throws(() => killGroup(process.pid), /Unsafe/);
  } finally { killGroup(a.pid); killGroup(b.pid); }
});

 test("cancelled and expired results do not expose downloads", () => {
  const payload = require("../src/services/generation/buildGenerationJobPayload");
  for (const extra of [{ cancelRequestedAt: new Date() }, { expiresAt: new Date(0) }]) {
    const result = payload({ _id: "id", status: "ready", expiresAt: new Date(Date.now() + 60000), files: { docx: "result.docx" }, layoutCheck: { status: "passed" }, ...extra });
    assert.equal(result.downloads, undefined);
    assert.equal(result.layoutCheck, undefined);
  }
});

for (const platform of ["win32", "darwin"]) test(`unsupported platform ${platform} rejects managed admission before writes`, async () => {
  const { api, records, cancelled } = registry(platform);
  await assert.rejects(api.prepare("f".repeat(64), "client"), {
    status: 503, code: "MANAGED_GENERATION_REQUIRES_LINUX",
  });
  assert.equal(records.size, 0);
  assert.equal(cancelled.length, 0);
  // Older callers without a lifecycle token retain their existing behavior.
  assert.equal(await api.prepare(null, "client"), null);
});
