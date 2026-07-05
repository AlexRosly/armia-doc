const router = require("express").Router();
const { check: ctrl } = require("../controllers");

// router.post("/create", ctrl.createReport);
router.get("/generation/:jobId", ctrl.checkStatus);
// GET /api/generation/:jobId/download/docx - downloadReport
// router.get("/generation/:jobId/download/docx", ctrl.downloadReport);
// router.get("/generation/:jobId/download/armdoc", ctrl.downloadArmdocReport);

module.exports = router;
