const { deleteGenerationJob } = require("../../services/generation");

const deleteGeneration = async (req, res, next) => {
  try {
    await deleteGenerationJob(req.params.jobId);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in controller deleteGeneration:", error);
    next(error);
  }
};

module.exports = deleteGeneration;
