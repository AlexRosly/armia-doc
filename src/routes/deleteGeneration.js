const router = require("express").Router();

const { generation: ctrl } = require("../controllers");

router.delete("/:jobId", ctrl.deleteGeneration);

module.exports = router;

// сервер автоматически:

// удалит .docx;
// удалит .pdf;
// удалит .armdoc;
// удалит запись ActDocument / OrderDocument / ReportDocument;
// удалит GenerationJob.
