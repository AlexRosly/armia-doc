const documentLabels = { act: "ЄАС", order: "наказ", report: "рапорт" };

const conflict = (code, message) => {
  const error = new Error(message);
  error.status = 409;
  error.code = code;
  throw error;
};

const assertCompatibleActiveJob = (job, requested, fingerprint) => {
  if (job.documentType !== requested.documentType || job.mode !== requested.mode) {
    conflict("ACTIVE_GENERATION_CONFLICT",
      `У вас уже створюється ${documentLabels[job.documentType] || "інший документ"}. Нову генерацію не запущено. Дочекайтеся завершення попередньої задачі або зверніться до підтримки.`);
  }
  if (!job.execution?.kind) {
    conflict("ACTIVE_GENERATION_REQUIRES_REVIEW",
      "Попередня задача потребує перевірки стану сервером. Нову генерацію не запущено. Зверніться до підтримки.");
  }
  if (!job.requestFingerprint || !fingerprint) {
    conflict("ACTIVE_GENERATION_REQUIRES_REVIEW",
      "Попередній документ ще обробляється. Сервер не може підтвердити, що цей запит є його повтором. Дочекайтеся завершення або зверніться до підтримки.");
  }
  if (job.requestFingerprint !== fingerprint) {
    conflict("ACTIVE_GENERATION_DATA_CONFLICT",
      "Попередній документ ще створюється, а дані нового запиту відрізняються. Нову генерацію не запущено. Дочекайтеся завершення попереднього документа.");
  }
};

module.exports = assertCompatibleActiveJob;
