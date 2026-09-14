const router = require("express").Router();

const { generation: ctrl } = require("../controllers");

router.get("/lifecycle", (_req, res) => res.json({ version: 3, supported: process.platform === "linux" }));

router.post("/close-request", require("../controllers/generation/closeGenerationRequest"));

router.delete("/:jobId", ctrl.deleteGeneration);

module.exports = router;
