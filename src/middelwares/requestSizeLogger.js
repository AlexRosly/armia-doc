const { logger } = require("../utils");

const requestSizeLogger = (req, res, next) => {
  const contentLength = req.headers["content-length"];

  if (contentLength) {
    logger.info({
      msg: "Incoming request size",
      method: req.method,
      url: req.originalUrl,
      contentLength: Number(contentLength),
    });
  }

  next();
};

module.exports = requestSizeLogger;
