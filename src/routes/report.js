const router = require("express").Router();
const { report: ctrl } = require("../controllers");
const { requestSizeLogger } = require("../middelwares");

router.post("/create", requestSizeLogger, ctrl.createReport);
// router.get("/generation/:jobId", ctrl.checkStatusReport);
// GET /api/generation/:jobId/download/docx - downloadReport
// router.get("/generation/:jobId/download/docx", ctrl.downloadReport);
// router.get("/generation/:jobId/download/armdoc", ctrl.downloadArmdocReport);

module.exports = router;
