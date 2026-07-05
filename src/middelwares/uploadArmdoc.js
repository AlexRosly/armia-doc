const multer = require("multer");
const path = require("path");

const uploadArmdoc = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext !== ".armdoc") {
      return cb(new Error("Only .armdoc files are allowed."));
    }

    cb(null, true);
  },
});

module.exports = uploadArmdoc;
// ✅ защита от
// .exe
// .pdf
// .zip
// .docx
// .png
