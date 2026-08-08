// const { logger } = require("../utils");

// const errorMiddleware = (err, req, res, next) => {
//   if (err?.type === "entity.too.large") {
//     logger.warn({
//       msg: "Payload too large",
//       type: err.type,
//       method: req.method,
//       url: req.originalUrl,
//     });

//     return res.status(413).json({
//       error: "PAYLOAD_TOO_LARGE",
//       message: "Request payload exceeds 1 MiB limit",
//     });
//   }

//   logger.error({
//     msg: err.message,
//     type: err.type,
//     code: err.code,
//     status: err.status,
//     method: req.method,
//     url: req.originalUrl,
//   });

//   const status = err.status || 500;

//   return res.status(status).json({
//     error: err.code || "INTERNAL_SERVER_ERROR",
//     message: err.message || "Internal server error",
//   });
// };

// module.exports = errorMiddleware;
const { logger } = require("../utils");

const errorMiddleware = (err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    logger.warn({
      msg: "Payload too large",
      type: err.type,
      method: req.method,
      url: req.originalUrl,
    });

    return res.status(413).json({
      error: "PAYLOAD_TOO_LARGE",
      message: "Request payload exceeds 1 MiB limit",
    });
  }

  logger.error({
    msg: err.message,
    type: err.type,
    code: err.code,
    status: err.status,
    method: req.method,
    url: req.originalUrl,
  });

  const status = err.status || 500;

  return res.status(status).json({
    error: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "Internal server error",
  });
};

module.exports = errorMiddleware;
