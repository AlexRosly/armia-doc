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
const downloadRouter = require("./routes/download");

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

app.use("/report", createReportRouter);
app.use("/download", downloadRouter);
app.use("/order", createOrderRouter);
app.use("/act", createActRouter);

app.use(errorMiddleware);

module.exports = app;
