const path = require("path");
const fs = require("fs/promises");
const os = require("os");

const { documentModels } = require("../../models");
const { generateArmdoc } = require("../../services/armdoc");

const exportArmdoc = async (req, res, next) => {
  try {
    const { documentType, documentId } = req.params;

    const Model = documentModels[documentType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Unsupported documentType: ${documentType}`,
      });
    }

    const document = await Model.findById(documentId).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const fileName = `case-${document._id}.armdoc`;
    const tempPath = path.join(os.tmpdir(), fileName);

    await generateArmdoc(document, tempPath);

    res.setHeader("Content-Type", "application/x-armdoc");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    return res.sendFile(tempPath, async (error) => {
      try {
        await fs.unlink(tempPath);
      } catch (_) {}

      if (error) {
        next(error);
      }
    });
  } catch (error) {
    console.error("Error in controller exportArmdoc:", error);
    next(error);
  }
};

module.exports = exportArmdoc;
