// локальные SSE-клиенты в рамках одного process
// const clientsByJobId = new Map();

// const addClient = (jobId, res) => {
//   if (!clientsByJobId.has(jobId)) {
//     clientsByJobId.set(jobId, new Set());
//   }

//   clientsByJobId.get(jobId).add(res);
// };

// const removeClient = (jobId, res) => {
//   const clients = clientsByJobId.get(jobId);
//   if (!clients) return;

//   clients.delete(res);

//   if (clients.size === 0) {
//     clientsByJobId.delete(jobId);
//   }
// };

// const sendToJobClients = (jobId, payload, eventName = "status") => {
//   const clients = clientsByJobId.get(jobId);
//   if (!clients || clients.size === 0) return;

//   const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

//   for (const res of clients) {
//     res.write(message);
//   }
// };

// module.exports = {
//   addClient,
//   removeClient,
//   sendToJobClients,
// };
const clientsByJobId = new Map();

const addClient = (jobId, client) => {
  if (!clientsByJobId.has(jobId)) {
    clientsByJobId.set(jobId, new Set());
  }

  clientsByJobId.get(jobId).add(client);
};

const removeClient = (jobId, client) => {
  const clients = clientsByJobId.get(jobId);
  if (!clients) return;

  clients.delete(client);

  if (clients.size === 0) {
    clientsByJobId.delete(jobId);
  }
};

const isTerminalStatus = (status) => ["ready", "failed"].includes(status);

const sendToJobClients = (jobId, payload, eventName = "status") => {
  const clients = clientsByJobId.get(jobId);
  if (!clients || clients.size === 0) return;

  const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  const shouldClose = isTerminalStatus(payload?.status);

  for (const client of [...clients]) {
    client.res.write(message);

    if (shouldClose && typeof client.close === "function") {
      client.close();
    }
  }
};

module.exports = {
  addClient,
  removeClient,
  sendToJobClients,
};
