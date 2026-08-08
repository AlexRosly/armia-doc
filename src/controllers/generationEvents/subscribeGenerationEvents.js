// const { addClient, removeClient } = require("../../services/generationEvents");
// const {
//   assertGenerationJobOwnership,
//   buildGenerationJobPayload,
// } = require("../../services/generation");

// const writeSseEvent = (res, eventName, payload) => {
//   res.write(`event: ${eventName}\n`);
//   res.write(`data: ${JSON.stringify(payload)}\n\n`);
// };

// const subscribeGenerationEvents = async (req, res, next) => {
//   try {
//     const { jobId } = req.params;

//     const job = await assertGenerationJobOwnership({
//       jobId,
//       clientId: req.clientId,
//     });

//     res.set({
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
//       Connection: "keep-alive",
//       "X-Accel-Buffering": "no",
//     });

//     if (typeof res.flushHeaders === "function") {
//       res.flushHeaders();
//     }

//     writeSseEvent(res, "connected", {
//       jobId: String(job._id),
//       connected: true,
//     });

//     writeSseEvent(res, "snapshot", buildGenerationJobPayload(job));

//     if (["ready", "failed"].includes(job.status)) {
//       res.end();
//       return;
//     }

//     addClient(String(job._id), res);

//     const heartbeat = setInterval(() => {
//       res.write(`: ping\n\n`);
//     }, 15000);

//     req.on("close", () => {
//       clearInterval(heartbeat);
//       removeClient(String(job._id), res);
//       res.end();
//     });
//   } catch (error) {
//     if (error.statusCode === 404) {
//       return res.status(404).json({ error: "JOB_NOT_FOUND" });
//     }

//     if (error.statusCode === 403) {
//       return res.status(403).json({ error: "FORBIDDEN" });
//     }

//     return next(error);
//   }
// };

// module.exports = subscribeGenerationEvents;
const { addClient, removeClient } = require("../../services/generationEvents");
const {
  assertGenerationJobOwnership,
  buildGenerationJobPayload,
} = require("../../services/generation");

const writeSseEvent = (res, eventName, payload) => {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const subscribeGenerationEvents = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await assertGenerationJobOwnership({
      jobId,
      clientId: req.clientId,
    });

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    writeSseEvent(res, "connected", {
      jobId: String(job._id),
      connected: true,
    });

    writeSseEvent(res, "snapshot", buildGenerationJobPayload(job));

    if (["ready", "failed"].includes(job.status)) {
      res.end();
      return;
    }

    let closed = false;
    let heartbeat = null;
    let client = null;

    const closeClient = () => {
      if (closed) return;
      closed = true;

      if (heartbeat) {
        clearInterval(heartbeat);
      }

      if (client) {
        removeClient(String(job._id), client);
      }

      res.end();
    };

    client = {
      res,
      close: closeClient,
    };

    addClient(String(job._id), client);

    heartbeat = setInterval(() => {
      if (!closed) {
        res.write(`: ping\n\n`);
      }
    }, 15000);

    req.on("close", closeClient);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: "JOB_NOT_FOUND" });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    return next(error);
  }
};

module.exports = subscribeGenerationEvents;
