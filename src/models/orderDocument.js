const { Schema, model } = require("mongoose");

const CostSchema = Schema(
  {
    value: {
      type: String,
      default: "",
    },
    sum: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "грн",
    },
  },
  { _id: false },
);

const listOfPropertySchema = Schema(
  {
    id: { type: String, required: true },
    itemName: { type: String, default: "" },
    unitOfMeasurement: { type: String, default: "" },
    quantity: { type: String, default: "" },
    manufactureYear: { type: String, default: "" },
    // cost: CostSchema,
  },
  { _id: false },
);

const subDivisionSchema = Schema(
  {
    subDivision: {
      type: String,
      default: "",
    },
    listOfProperty: [listOfPropertySchema],
  },
  { _id: false },
);

const LostPropertySchema = Schema(
  {
    service: { type: String, default: "" },
    subDivisions: [subDivisionSchema],
  },
  { _id: false },
);

// const servicesSchema = Schema(
//   {
//     item: { type: String, default: "" },
//   },
//   { _id: false },
// );

const TextBlockSchema = Schema(
  {
    text: { type: String, default: "" },
    services: { type: Boolean, default: false },
  },
  { _id: false },
);

const SignerSchema = Schema(
  {
    position: { type: String, default: "" },
    // militaryUnit: { type: String, default: "" },
    rank: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
  },
  { _id: false },
);

const DocumentDataSchema = Schema(
  {
    orderDetails: {
      whoseOrder: { type: String, default: "" },
      settlement: { type: String, default: "" },
      orderDate: { type: String, default: "" },
      orderTitle: { type: String, default: "" },
      orderNumber: {
        type: Number,
      },
    },
    eventDescription: TextBlockSchema,
    lostProperty: [LostPropertySchema],
    eventConfirmation: TextBlockSchema,
    directiveSection: [TextBlockSchema],
    signer: SignerSchema,
  },
  { _id: false },
);

const approvalDateSchema = Schema(
  {
    day: { type: String },
    month: { type: String },
    year: { type: String, required: true },
  },
  { _id: false },
);

const approvalsSchema = Schema(
  {
    id: { type: String, required: true },
    position: { type: String, required: true, default: "" },
    rank: { type: String, required: true, default: "" },
    firstName: { type: String, required: true, default: "" },
    lastName: { type: String, required: true, default: "" },
    approvalDate: approvalDateSchema,
  },
  { _id: false },
);

const legalApproval = Schema(
  {
    position: { type: String, required: true, default: "" },
    rank: { type: String, required: true, default: "" },
    firstName: { type: String, required: true, default: "" },
    lastName: { type: String, required: true, default: "" },
    approvalDate: approvalDateSchema,
  },
  { _id: false },
);

const orderPreparedSchema = Schema(
  {
    position: { type: String, required: true, default: "" },
    rank: { type: String, required: true, default: "" },
    firstName: { type: String, required: true, default: "" },
    lastName: { type: String, required: true, default: "" },
    preparedDate: approvalDateSchema,
  },
  { _id: false },
);

const approvalAndVisaSchema = Schema(
  {
    approvals: [approvalsSchema],
    legalApproval: legalApproval,
    orderPreparedBy: orderPreparedSchema,
  },
  { _id: false },
);

const hybridPrintSchema = Schema(
  {
    enabled: { type: Boolean, required: true, default: true },
    insertBlankPages: { type: Boolean, required: true, default: true },
    blankPageStrategy: { type: String, required: true, default: "" },
    finalDuplexPageCount: { type: Number, required: true },
    printerDuplexMode: { type: String, required: true, default: "" },
    outputMode: { type: String, required: true, default: "" },
  },
  { _id: false },
);

const printSettingsSchema = Schema(
  {
    printMode: { type: String, required: true, default: "" },
    hybridPrint: hybridPrintSchema,
  },
  { _id: false },
);

const OrderDocumentSchema = Schema(
  {
    caseId: {
      type: String,
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      required: true,
      enum: ["order"],
    },

    mode: {
      type: String,
      required: true,
      enum: ["with_armdoc", "docx_only"],
    },
    data: {
      type: DocumentDataSchema,
      required: true,
    },
    approvalAndVisa: approvalAndVisaSchema,
    printSettings: printSettingsSchema,
  },
  { timestamps: true, versionKey: false },
);

const OrderDocument = model("order", OrderDocumentSchema);

module.exports = OrderDocument;
