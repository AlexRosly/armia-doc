const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { createRequire } = require("node:module");

function load(file, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, "..", file);
  const module = { exports: {} };
  const realRequire = createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : realRequire(name),
    process, console: { log() {}, warn() {}, error() {} }, Date, setTimeout, clearTimeout,
    ...globals,
  }, { filename });
  return module.exports;
}

const owner = { kind: "inline", instanceId: "old", pid: 123, uid: 1000,
  host: "host", machine: "machine", boot: "boot", pidNamespace: "pid:[1]", processStart: "456" };
function ownership({ missing = false, denied = false, start = "456", state = "S", host = "host", boot = "boot", namespace = "pid:[1]" } = {}) {
  return load("src/services/generation/inlineExecutionOwner.js", {
    "os": { hostname: () => host },
    "fs/promises": {
      readFile: async (name) => {
        if (name === "/etc/machine-id") return "machine\n";
        if (name.endsWith("boot_id")) return boot;
        if (missing || denied) throw Object.assign(new Error("proc"), { code: missing ? "ENOENT" : "EACCES" });
        return `123 (name with (parens)) ${state} ${Array(18).fill("0").join(" ")} ${start} 0`;
      },
      readlink: async () => namespace,
    },
  }, { process: { env: { QUEUE_ENABLED: "false" }, pid: 123, getuid: () => 1000 } });
}
for (const [name, options, expected] of [
  ["live owner", {}, false], ["exited owner", { missing: true }, true],
  ["PID reused", { start: "999" }, true], ["zombie owner", { state: "Z" }, true],
  ["different host", { host: "another" }, false], ["host reboot", { boot: "new" }, true],
  ["different PID namespace", { namespace: "pid:[2]" }, false],
  ["permission denied", { denied: true }, false],
]) test(`owner detection: ${name}`, async () => {
  assert.equal(await ownership(options).isInlineOwnerStopped(owner), expected);
});
test("legacy, queue and different-UID owners are never declared stopped", async () => {
  const check = ownership({ missing: true }).isInlineOwnerStopped;
  for (const item of [undefined, {}, { ...owner, kind: "queue" }, { ...owner, uid: 999 }]) {
    assert.equal(await check(item), false);
  }
});
test("new inline owner records stable process identity", async () => {
  const api = ownership();
  const a = await api.createExecutionOwner(), b = await api.createExecutionOwner();
  assert.equal(a.processStart, "456");
  assert.equal(a.instanceId, b.instanceId);
  assert.equal(a.uid, 1000);
});

const assertCompatible = require("../src/services/generation/assertCompatibleActiveJob");
test("generation reaches ready when all progress publications reject", async () => {
  const updates = [], files = [];
  let published = 0;
  const run = load("src/services/generation/runGenerationJob.js", {
    "fs/promises": { access: async file => files.push(file) },
    "../armdoc": {},
    "../layout": { runProfiles: async () => ({
      docxPath: "/tmp/report.docx", pdfPath: "/tmp/report.pdf", status: "passed", profile: "tested",
    }) },
    "../../models": { GenerationJob: { findOneAndUpdate: async (filter, update) => {
      updates.push(update); return { _id: filter._id, ...update };
    } } },
    "../generationEvents": { publishGenerationEvent: async () => {
      published++; throw new Error("Redis command timed out");
    } },
    "./buildGenerationJobPayload": job => ({ jobId: job._id, status: job.status }),
  });
  await run({ documentType: "report" }, { _id: "id", documentType: "report", mode: "docx_only" });
  assert.deepEqual(updates.map(update => update.status), ["processing", "ready"]);
  assert.equal(updates[1].files.docx, "report.docx");
  assert.equal(files.length, 2);
  assert.ok(published >= 3);
});
test("act cannot be reused as report (HTTP 409)", () => {
  assert.throws(() => assertCompatible({ documentType: "act", mode: "docx_only" },
    { documentType: "report", mode: "docx_only" }), error => error.status === 409 && error.code === "ACTIVE_GENERATION_CONFLICT");
});
test("mode mismatch conflicts; known matching job is reusable; legacy requires review", () => {
  const job = { documentType: "act", mode: "docx_only", execution: { kind: "inline" }, requestFingerprint: "hash" };
  assert.doesNotThrow(() => assertCompatible(job, job, "hash"));
  assert.throws(() => assertCompatible(job, { ...job, mode: "with_armdoc" }), { code: "ACTIVE_GENERATION_CONFLICT" });
  assert.throws(() => assertCompatible({ ...job, execution: undefined }, job), { code: "ACTIVE_GENERATION_REQUIRES_REVIEW" });
});
test("stopped owner recovery is conditional and does not delete files", async () => {
  let update;
  const recover = load("src/services/generation/recoverInterruptedGenerationJob.js", {
    "../../models": { GenerationJob: { findOneAndUpdate: async (filter, values) => {
      update = { filter, values }; return { _id: "id", status: "failed" };
    } } },
    "./inlineExecutionOwner": { isInlineOwnerStopped: async () => true },
  });
  assert.equal((await recover({ _id: "id", status: "processing", execution: owner })).status, "failed");
  assert.equal(update.filter["execution.instanceId"], "old");
  assert.equal(update.values.$set.status, "failed");
  assert.equal(update.values.$set.files, undefined);
});
test("a concurrent completion wins over recovery", async () => {
  const recover = load("src/services/generation/recoverInterruptedGenerationJob.js", {
    "../../models": { GenerationJob: { findOneAndUpdate: async () => null,
      findById: async () => ({ status: "ready" }) } },
    "./inlineExecutionOwner": { isInlineOwnerStopped: async () => true },
  });
  assert.equal((await recover({ _id: "id", status: "processing", execution: owner })).status, "ready");
});
test("ready and unknown owners are not recovered", async () => {
  const recover = load("src/services/generation/recoverInterruptedGenerationJob.js", {
    "../../models": { GenerationJob: {} },
    "./inlineExecutionOwner": { isInlineOwnerStopped: async () => { throw new Error("must not inspect"); } },
  });
  for (const job of [{ status: "ready", execution: owner }, { status: "processing" }]) assert.equal(await recover(job), job);
});

for (const protectedFile of [true, false, "database-unavailable"]) {
  test(`orphan cleanup: protected=${protectedFile}`, async () => {
    let deleted = 0, query;
    const cleanup = load("src/services/cleanup/cleanupOrphanFiles.js", {
      "fs/promises": { readdir: async () => [{ name: "6aa65bea0c6d3645ec88ee53__act_candidate_0350.docx", isFile: () => true }],
        stat: async () => ({ mtimeMs: 0 }), unlink: async () => { deleted++; } },
      "../../models": { GenerationJob: { exists: async (filter) => {
        query = filter;
        if (protectedFile === "database-unavailable") throw new Error("db offline");
        return protectedFile;
      } } },
    }, { __dirname: path.resolve(__dirname, "../src/services/cleanup") });
    await cleanup();
    assert.equal(deleted, protectedFile === false ? 3 : 0);
    assert.equal(query._id, "6aa65bea0c6d3645ec88ee53");
    assert.equal(query.$or[0].status.$in.includes("processing"), true);
    assert.equal(query.$or[1].status, "ready");
  });
}
test("processing snapshots never claim the default layout passed", () => {
  const build = require("../src/services/generation/buildGenerationJobPayload");
  const job = { _id: "id", status: "processing", layoutCheck: { status: "passed", profile: "default_14_100_top_20" } };
  assert.equal(build(job).layoutCheck, undefined);
  assert.equal(build({ ...job, status: "ready" }).layoutCheck.status, "passed");
});
test("publisher uses separate bounded connection, not the BullMQ client", async () => {
  let options, called = 0;
  const publisher = load("src/services/generationEvents/publisher.js", {
    "../../queue/connection": { duplicate: (value) => { options = value; return {
      on() {}, publish: async () => { called++; },
    }; } },
  });
  await publisher.publishGenerationEvent({ jobId: "id", status: "ready" });
  assert.equal(called, 1);
  assert.equal(options.enableOfflineQueue, false);
  assert.equal(options.commandTimeout, 2000);
  assert.equal(options.maxRetriesPerRequest, 1);
});
test("persist refuses a foreign document type before loading or enqueueing it", async () => {
  const persist = load("src/services/generation/persistAndGenerate.js", {
    "./ensureActiveJobIndex": { ensureActiveJobIndex: async () => {} },
    "mongoose": {}, "./createGenerationJob": () => { throw new Error("unexpected create"); },
    "./startGeneration": () => { throw new Error("unexpected enqueue"); },
    "./findActiveGenerationJobByClientId": async () => ({ documentType: "act", mode: "docx_only", execution: owner }),
    "../../models": { GenerationJob: {}, documentModels: {} },
  });
  await assert.rejects(persist({ clientId: "client", payload: { documentType: "report", mode: "docx_only" } }), { code: "ACTIVE_GENERATION_CONFLICT" });
});

for (const [name, flags, kind, changed, writes, exitCode] of [
  ["dry run", [], undefined, false, 0, undefined],
  ["missing confirmation", ["--apply"], undefined, false, 0, 1],
  ["missing snapshot", ["--apply", "--confirm-no-live-executor"], undefined, false, 0, 1],
  ["queue owner", ["--apply", "--confirm-no-live-executor", "--expected-updated-at", "2026-09-13T10:00:00Z"], "queue", false, 0, 1],
  ["confirmed legacy", ["--apply", "--confirm-no-live-executor", "--expected-updated-at", "2026-09-13T10:00:00Z"], undefined, false, 1, undefined],
  ["concurrent change", ["--apply", "--confirm-no-live-executor", "--expected-updated-at", "2026-09-13T10:00:00Z"], undefined, true, 1, 1],
]) test(`operator recovery: ${name}`, async () => {
  let finished, count = 0;
  const done = new Promise(resolve => { finished = resolve; });
  const job = { _id: "6aa65bea0c6d3645ec88ee53", status: "processing", updatedAt: new Date("2026-09-13T10:00:00Z"), execution: kind ? { kind } : undefined };
  const mockProcess = { argv: ["node", "script", job._id, ...flags] };
  load("scripts/recover-generation-job.js", {
    dotenv: { config() {} }, mongoose: { disconnect: async () => finished() },
    "../src/config/db": async () => {},
    "../src/models": { GenerationJob: {
      findById: async () => job,
      findOneAndUpdate: async (filter, update) => {
        count++;
        assert.equal(filter.updatedAt.getTime(), job.updatedAt.getTime());
        assert.equal(filter.status, "processing");
        assert.equal(update.$set.status, "failed");
        return changed ? null : { ...job, status: "failed" };
      },
    } },
    "../src/services/generation/inlineExecutionOwner": { isInlineOwnerStopped: async () => false },
  }, { process: mockProcess });
  await done;
  assert.equal(count, writes);
  assert.equal(mockProcess.exitCode, exitCode);
});

const fingerprint = require("../src/services/generation/requestFingerprint");
test("fingerprint ignores key order and root server metadata only", () => {
  assert.equal(fingerprint({ data: { b: 2, a: "шт." }, _id: "old" }), fingerprint({ data: { a: "шт.", b: 2 }, updatedAt: "new" }));
  for (const data of [{ a: "шт", b: 2 }, { a: "шт.", b: "2" }, { a: "шт. ", b: 2 }]) {
    assert.notEqual(fingerprint({ data }), fingerprint({ data: { a: "шт.", b: 2 } }));
  }
  assert.notEqual(fingerprint({ items: [1, 2] }), fingerprint({ items: [2, 1] }));
  assert.notEqual(fingerprint({ data: { _id: "a" } }), fingerprint({ data: { _id: "b" } }));
});
test("same type with changed data is rejected; missing fingerprint is not silently reused", () => {
  const job = { documentType: "report", mode: "docx_only", execution: owner, requestFingerprint: "a" };
  assert.throws(() => assertCompatible(job, job, "b"), { code: "ACTIVE_GENERATION_DATA_CONFLICT" });
  assert.throws(() => assertCompatible({ ...job, requestFingerprint: undefined }, job, "a"), { code: "ACTIVE_GENERATION_REQUIRES_REVIEW" });
});
test("index installation is shared, unique across active statuses, and retries after failure", async () => {
  let calls = 0;
  const api = load("src/services/generation/ensureActiveJobIndex.js", {
    "../../models": { GenerationJob: { collection: { createIndex: async (key, options) => {
      calls++;
      assert.equal(key.clientId, 1);
      assert.equal(options.unique, true);
      assert.equal(options.partialFilterExpression.clientId.$type, "string");
      assert.equal(options.partialFilterExpression.status.$in.join(","), "queued,processing");
      if (calls === 1) throw new Error("index unavailable");
      return options.name;
    } } } },
  });
  await assert.rejects(api.ensureActiveJobIndex());
  await Promise.all([api.ensureActiveJobIndex(), api.ensureActiveJobIndex()]);
  assert.equal(calls, 2);
});
for (const changed of [false, true]) test(`transaction loser ${changed ? "rejects changed data" : "reuses identical winner"}`, async () => {
  let started = 0, ended = 0, reads = 0;
  const payload = { documentType: "report", mode: "docx_only", data: { text: "one" } };
  const winner = { _id: "winner", documentId: "doc", documentType: "report", mode: "docx_only", execution: owner,
    requestFingerprint: fingerprint(changed ? { ...payload, data: { text: "two" } } : payload) };
  const persist = load("src/services/generation/persistAndGenerate.js", {
    "mongoose": { startSession: async () => ({
      withTransaction: async callback => callback(), endSession: async () => { ended++; },
    }) },
    "./ensureActiveJobIndex": { ensureActiveJobIndex: async () => {} },
    "./createGenerationJob": async () => { throw Object.assign(new Error("one_active_generation_per_client"), { code: 11000 }); },
    "./findActiveGenerationJobByClientId": async () => ++reads === 1 ? null : winner,
    "./startGeneration": async () => { started++; },
    "../../models": { GenerationJob: {}, documentModels: { report: { findById: async () => ({ _id: "doc" }) } } },
  });
  const request = persist({ model: { create: async () => [{ _id: "speculative" }] }, payload, clientId: "client" });
  if (changed) await assert.rejects(request, { code: "ACTIVE_GENERATION_DATA_CONFLICT" });
  else { const result = await request; assert.equal(result.job._id, "winner"); assert.equal(result.existing, true); }
  assert.equal(started, 0);
  assert.equal(ended, 1);
});
test("index failure blocks creation before any source document or job write", async () => {
  const persist = load("src/services/generation/persistAndGenerate.js", {
    mongoose: { startSession: () => assert.fail("must not start") },
    "./ensureActiveJobIndex": { ensureActiveJobIndex: async () => { throw new Error("index unavailable"); } },
    "./createGenerationJob": () => assert.fail("must not create"),
    "./startGeneration": () => assert.fail("must not start"),
    "./findActiveGenerationJobByClientId": () => assert.fail("must not read"),
    "../../models": {},
  });
  await assert.rejects(persist({ payload: {}, clientId: "client" }), { status: 503, code: "GENERATION_ADMISSION_UNAVAILABLE" });
  await assert.rejects(persist({ payload: {} }), { code: "CLIENT_ID_REQUIRED" });
});

for (const unavailable of [false, true]) test(`API listens when admission index unavailable=${unavailable}`, async () => {
  let listens = 0, exits = 0;
  const errors = [];
  load("server.js", {
    dotenv: { config() {} },
    "./src/app": { listen: (_port, callback) => { listens++; callback(); } },
    "./src/utils": { logger: { info() {}, error: (...args) => errors.push(args) } },
    "./src/config/db": async () => {},
    "./src/services/generation/lifecycle/cleanup": { start() {} },
    "./src/services/generation/ensureActiveJobIndex": { ensureActiveJobIndex: async () => {
      if (unavailable) throw Object.assign(new Error("IndexOptionsConflict"), { code: 85 });
    } },
  }, { process: { env: {}, exit: () => { exits++; } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(listens, 1);
  assert.equal(exits, 0);
  assert.equal(errors.length, unavailable ? 1 : 0);
  if (unavailable) assert.equal(errors[0][0].err.code, 85);
});

test("index preflight uses exactly the index filter and never changes legacy jobs", async () => {
  let finish, filter;
  const done = new Promise(resolve => { finish = resolve; });
  const models = { GenerationJob: { collection: {
    listIndexes: () => ({ toArray: async () => [] }),
  }, aggregate: async pipeline => { filter = pipeline[0].$match; return []; } } };
  const index = load("src/services/generation/ensureActiveJobIndex.js", { "../../models": models });
  load("scripts/check-active-generation-index.js", {
    dotenv: { config() {} },
    mongoose: { set: (key, value) => { assert.equal(key, "autoIndex"); assert.equal(value, false); },
      connection: { db: { admin: () => ({ command: async () => ({ version: "8.0.32" }) }) } },
      disconnect: async () => finish() },
    "../src/config/db": async () => {},
    "../src/models": models,
    "../src/services/generation/ensureActiveJobIndex": { ...index,
      ensureActiveJobIndex: () => assert.fail("read-only preflight must not create indexes") },
  }, { process: { argv: [] } });
  await done;
  assert.equal(filter, index.OPTIONS.partialFilterExpression);
  assert.equal(filter.clientId.$type, "string");
  assert.equal(filter.status.$in.join(","), "queued,processing");
});
