const express = require("express");
const cors = require("cors");
const pinoHttp = require("pino-http");
const { logger } = require("./utils");
const { errorMiddleware } = require("./middelwares");
const path = require("path");
const cron = require("node-cron");
const { cleanup: ctrl } = require("./services");

const createReportRouter = require("./routes/report");
const createOrderRouter = require("./routes/order");
const createActRouter = require("./routes/act");
const checkStatusRouter = require("./routes/checkStatus");
const downloadRouter = require("./routes/download");
const importRouter = require("./routes/armdoc");
const generationRouter = require("./routes/deleteGeneration");
const healthRouter = require("./routes/health");

// const swaggerUi = require("swagger-ui-express");
// const YAML = require("yamljs");

// const swaggerDocument = YAML.load("./swagger.yaml");

const app = express();

ctrl.startCleanupScheduler();
app.use(pinoHttp({ logger }));
app.use("/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://www.gptiti.com",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://ypbooking.chost.com.ua",
    ],
    credentials: true,
  }),
);

app.use("/api/report", createReportRouter);
app.use("/api/order", createOrderRouter);
// app.use("/api/act", createActRouter);
app.use("/api/check-status", checkStatusRouter);
app.use("/api/download", downloadRouter);
app.use("/api/import", importRouter);
app.use("/api/generation", generationRouter);
app.use("/api/health", healthRouter);

app.use(errorMiddleware);

module.exports = app;
