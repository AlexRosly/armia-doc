const router = require("express").Router();
const { check: ctrl } = require("../controllers");
const { generationEvents: ctrls } = require("../controllers");

router.get("/generation/:jobId", ctrl.checkStatus);
router.get("/generation/:jobId/events", ctrls.subscribeGenerationEvents);

module.exports = router;
