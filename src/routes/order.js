const router = require("express").Router();
const { order: ctrl } = require("../controllers");

router.post("/create", ctrl.createOrder);
// router.get("/generation/:jobId", ctrl.checkStatusReport);
// GET /api/generation/:jobId/download/docx - downloadReport
// router.get("/generation/:jobId/download/docx", ctrl.downloadReport);
// router.get("/generation/:jobId/download/armdoc", ctrl.downloadArmdocReport);

module.exports = router;
