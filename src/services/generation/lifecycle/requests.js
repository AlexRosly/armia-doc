const { createHash } = require("crypto");
const Request = require("../../../models/generationRequest");
const { GenerationJob } = require("../../../models");
const rejection = () => Object.assign(new Error("Створення документа скасовано після виходу зі сторінки."), { status: 409, code: "GENERATION_CANCELLED" });
const requestId = token => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw Object.assign(new Error("Некоректний запит."), { status: 400, code: "INVALID_GENERATION_TOKEN" });
  }
  return createHash("sha256").update(token).digest("hex");
};
const expiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
async function prepare(token, clientId) {
  if (!token) return null;
  if (process.platform !== "linux") {
    throw Object.assign(new Error("Створення документа тимчасово недоступне. Зверніться до підтримки."), { status: 503, code: "MANAGED_GENERATION_REQUIRES_LINUX" });
  }
  const id = requestId(token);
  try {
    await Request.updateOne({ _id: id }, { $setOnInsert: { clientId, expiresAt: expiry() } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  const record = await Request.findById(id);
  if (!record || record.closedAt || record.clientId !== clientId) throw rejection();
  return id;
}
async function attach(id, job, clientId, session = null) {
  if (!id) return;
  if (!job.lifecycleManaged || job.cancelRequestedAt) throw rejection();
  const result = await Request.updateOne({ _id: id, clientId, closedAt: null }, {
    $set: { jobId: job._id, touchedAt: new Date() }, $unset: { expiresAt: "" },
  }, session ? { session } : {});
  if (result.matchedCount !== 1) throw rejection();
}
async function close(token) {
  const id = requestId(token);
  let record;
  // This durable marker also handles close arriving BEFORE create/jobId.
  try {
    record = await Request.findOneAndUpdate({ _id: id }, {
      $set: { closedAt: new Date(), expiresAt: expiry() },
    }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return close(token);
  }
  if (!record.jobId) return;
  // An identical job still explicitly viewed in another tab may finish there.
  if (await Request.exists({ jobId: record.jobId, closedAt: null })) return;
  await GenerationJob.updateOne({ _id: record.jobId, lifecycleManaged: true }, {
    $set: { cancelRequestedAt: new Date(), cancelReason: "page_left" },
  });
  require("./supervisor").interrupt(String(record.jobId));
}
module.exports = { prepare, attach, close, requestId, rejection };
