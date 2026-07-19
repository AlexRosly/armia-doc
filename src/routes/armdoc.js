const router = require("express").Router();
const { importDoc: ctrl } = require("../controllers");
const { uploadArmdoc } = require("../middelwares");

router.post("/open", uploadArmdoc.single("file"), ctrl.openArmdoc); //openDocument

module.exports = router;
