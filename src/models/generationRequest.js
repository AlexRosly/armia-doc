const { Schema, model } = require("mongoose");
// A capability hash only: never store the browser's cancellation token or payload.
// Closed requests remain briefly to reject a delayed create after page departure.
module.exports = model("generationRequest", new Schema({
  _id: String,
  clientId: String,
  jobId: Schema.Types.ObjectId,
  closedAt: Date,
  touchedAt: Date,
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
}, { versionKey: false }));
