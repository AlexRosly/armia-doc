const router = require("express").Router();
const { download: ctrl } = require("../controllers");

router.get("/:jobId/download/:type", ctrl.downloadFile);

module.exports = router;
