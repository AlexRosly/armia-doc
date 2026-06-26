const { Schema, model } = require("mongoose");

const listOfPropertySchema = Schema(
  {
    id: { type: String, required: true },
    itemName: { type: String, default: "" },
    unitOfMeasurement: { type: String, default: "" },
    quantity: { type: String, default: "" },
    manufactureYear: { type: String, default: "" },
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
    // id: { type: String, required: true },
    service: { type: String, default: "" },
    subDivisions: [subDivisionSchema],
    // itemName: { type: String, default: "" },
    // identification: { type: String, default: "" },
    // manufactureYear: { type: String, default: "" },
    // quantity: { type: String, default: "" },
    // note: { type: String, default: "" },
  },
  { _id: false },
);

const TextBlockSchema = Schema(
  {
    text: { type: String, default: "" },
  },
  { _id: false },
);

const SpecialPropertyCasesSchema = Schema(
  {
    status: {
      type: String,
      enum: ["none", "exists"],
      default: "none",
    },
    text: { type: String, default: "" },
  },
  { _id: false },
);

const SignerSchema = Schema(
  {
    position: { type: String, default: "" },
    militaryUnit: { type: String, default: "" },
    rank: { type: String, default: "" },
    fullName: { type: String, default: "" },
    date: { type: Date },
  },
  { _id: false },
);

const DocumentDataSchema = Schema(
  {
    documentDetails: {
      recipient: { type: String, default: "" },
      documentTitle: { type: String, default: "" },
    },

    eventDescription: TextBlockSchema,

    lostProperty: [LostPropertySchema],

    specialPropertyCases: SpecialPropertyCasesSchema,

    confirmationAndGrounds: TextBlockSchema,

    lossCircumstances: TextBlockSchema,

    additionalInfo: TextBlockSchema,

    requestPart: TextBlockSchema,

    signer: SignerSchema,
  },
  { _id: false },
);

const ReportDocumentSchema = Schema(
  {
    caseId: {
      type: String,
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      required: true,
      enum: ["report"],
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
  },
  { timestamps: true, versionKey: false },
);

const ReportDocument = model("report", ReportDocumentSchema);

module.exports = ReportDocument;
