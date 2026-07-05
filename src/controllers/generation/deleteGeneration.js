const { deleteGenerationJob } = require("../../services/generation");

const deleteGeneration = async (req, res, next) => {
  try {
    await deleteGenerationJob(req.params.jobId);

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteGeneration;
