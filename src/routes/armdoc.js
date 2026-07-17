const router = require("express").Router();
const { importDoc: ctrl } = require("../controllers");
const { uploadArmdoc } = require("../middelwares");

router.post("/open", uploadArmdoc.single("file"), ctrl.openArmdoc); //openDocument
// router.post("/import", uploadArmdoc.single("file"), ctrl.importArmdoc); //import + generate
// router.get("/export/:documentType/:documentId", ctrl.exportArmdoc); //download

module.exports = router;
