const { Schema, model } = require("mongoose");

const ActProfileCacheSchema = new Schema(
  {
    fingerprintKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    layoutProfile: {
      type: String,
      required: true,
      index: true,
    },
    fingerprint: {
      type: Schema.Types.Mixed,
      required: true,
    },
    profile: {
      type: Schema.Types.Mixed,
      required: true,
    },
    hits: {
      type: Number,
      default: 1,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = model("actProfileCache", ActProfileCacheSchema);
