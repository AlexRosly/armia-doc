const { readArmdoc } = require("../../services/armdoc");

const openArmdoc = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const document = readArmdoc(req.file);

    return res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Error in controller openArmdoc:", error);
    next(error);
  }
};

module.exports = openArmdoc;
