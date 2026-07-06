const router = require("express").Router();
const { importDoc: ctrl } = require("../controllers");
const { uploadArmdoc } = require("../middelwares");

router.post("/", uploadArmdoc.single("file"), ctrl.importArmdoc);

module.exports = router;

// POST   /armdoc/export      ← создать .armdoc

// POST   /armdoc/import      ← открыть .armdoc

// GET    /download/:jobId    ← скачать

// DELETE /armdoc/:jobId      ← удалить вручную (если потребуется)

// Cleanup Scheduler          ← автоудаление
