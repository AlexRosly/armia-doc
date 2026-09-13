// // const { Schema, model } = require("mongoose");

// // const printSettingsSchema = Schema({
// //   printMode: { type: String },
// // });

// // const GenerationJobSchema = Schema(
// //   {
// //     caseId: {
// //       type: String,
// //       required: true,
// //       index: true,
// //     },
// //     documentType: {
// //       type: String,
// //       required: true,
// //       enum: ["report", "order", "act"],
// //     },
// //     documentId: {
// //       type: Schema.Types.ObjectId,
// //       required: true,
// //     },
// //     mode: {
// //       type: String,
// //       enum: ["with_armdoc", "docx_only"],
// //       required: true,
// //     },

// //     status: {
// //       type: String,
// //       enum: ["processing", "ready", "failed"],
// //       default: "processing",
// //     },
// //     error: {
// //       type: String,
// //       default: null,
// //     },
// //     files: {
// //       docx: String,
// //       pdf: String,
// //       armdoc: String,
// //     },
// //     layoutCheck: {
// //       status: {
// //         type: String,
// //         enum: ["passed", "best_effort", "failed"],
// //         default: "passed",
// //       },
// //       profile: {
// //         type: String,
// //         default: "default_14_100_top_20",
// //       },
// //       printSettings: printSettingsSchema,
// //     },
// //     expiresAt: {
// //       type: Date,
// //       required: true,
// //     },
// //   },
// //   {
// //     timestamps: true,
// //   },
// // );

// // const GenerationJob = model("generationJob", GenerationJobSchema);

// // module.exports = GenerationJob;
// const { Schema, model } = require("mongoose");

// const printSettingsSchema = Schema({
//   printMode: { type: String },
// });

// const layoutCheckSchema = Schema(
//   {
//     status: {
//       type: String,
//       enum: ["passed", "best_effort", "failed"],
//       default: "passed",
//     },
//     profile: {
//       type: String,
//       default: "default_14_100_top_20",
//     },
//     orderProfile: {
//       type: String,
//       default: null,
//     },
//     approvalProfile: {
//       type: String,
//       default: null,
//     },
//     printSettings: printSettingsSchema,
//   },
//   { _id: false },
// );

// const GenerationJobSchema = Schema(
//   {
//     caseId: {
//       type: String,
//       required: true,
//       index: true,
//     },
//     documentType: {
//       type: String,
//       required: true,
//       enum: ["report", "order", "act"],
//     },
//     documentId: {
//       type: Schema.Types.ObjectId,
//       required: true,
//     },
//     mode: {
//       type: String,
//       enum: ["with_armdoc", "docx_only"],
//       required: true,
//     },

//     status: {
//       type: String,
//       enum: ["queued", "processing", "ready", "failed"],
//       default: "queued",
//     },
//     error: {
//       type: String,
//       default: null,
//     },
//     files: {
//       docx: String,
//       pdf: String,
//       armdoc: String,
//     },
//     layoutCheck: {
//       type: layoutCheckSchema,
//       default: () => ({}),
//     },
//     expiresAt: {
//       type: Date,
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   },
// );

// const GenerationJob = model("generationJob", GenerationJobSchema);

// module.exports = GenerationJob;
const { Schema, model } = require("mongoose");

const printSettingsSchema = Schema({
  printMode: { type: String },
});

const layoutCheckSchema = Schema(
  {
    status: {
      type: String,
      enum: ["passed", "best_effort", "failed"],
      default: undefined,
    },
    profile: {
      type: String,
      default: undefined,
    },
    orderProfile: {
      type: String,
      default: null,
    },
    approvalProfile: {
      type: String,
      default: null,
    },
    printSettings: printSettingsSchema,
  },
  { _id: false },
);

const GenerationJobSchema = Schema(
  {
    requestFingerprint: { type: String },
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    caseId: {
      type: String,
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ["report", "order", "act"],
    },
    documentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    mode: {
      type: String,
      enum: ["with_armdoc", "docx_only"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "ready", "failed"],
      default: "queued",
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    files: {
      docx: String,
      pdf: String,
      armdoc: String,
    },
    layoutCheck: {
      type: layoutCheckSchema,
      default: undefined,
    },
    execution: {
      type: new Schema({
        kind: { type: String, enum: ["inline", "queue"] },
        instanceId: String,
        pid: Number,
        uid: Number,
        host: String,
        machine: String,
        boot: String,
        pidNamespace: String,
        processStart: String,
      }, { _id: false }),
      default: undefined,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const GenerationJob = model("generationJob", GenerationJobSchema);

module.exports = GenerationJob;
