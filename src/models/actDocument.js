const { Schema, model } = require("mongoose");

//
// COMMON
//

const approvalDateSchema = Schema(
  {
    day: { type: String, default: "" },

    month: { type: String, default: "" },

    year: { type: String, default: "" },
  },
  { _id: false },
);

const PersonSchema = Schema(
  {
    position: { type: String, default: "" },

    rank: { type: String, default: "" },

    firstName: { type: String, default: "" },

    lastName: { type: String, default: "" },
  },
  { _id: false },
);

//
// APPROVAL
//

const ApprovalSchema = Schema(
  {
    copyNumber: { type: String, default: "" },

    position: { type: String, default: "" },

    rank: { type: String, default: "" },

    firstName: { type: String, default: "" },

    lastName: { type: String, default: "" },

    approvalDate: approvalDateSchema,
  },
  { _id: false },
);

//
// ACCOUNTING
//

const AccountingDetailsSchema = Schema(
  {
    operationBasis: {
      type: String,

      default: "",
    },

    militaryUnit: {
      type: String,

      default: "",
    },
  },
  { _id: false },
);

//
// PROPERTY
//

const CostSchema = Schema(
  {
    primaryUnitCostUah: {
      type: String,

      default: "",
    },

    residualUnitCostUah: {
      type: String,

      default: "",
    },

    // totalCostUah: {
    //   type: String,

    //   default: "",
    // },

    // totalResidualCostUah: {
    //   type: String,

    //   default: "",
    // },

    currency: {
      type: String,

      default: "грн",
    },
    grandTotalResidualCostUah: {
      type: String,

      default: "грн",
    },
  },
  { _id: false },
);

const WriteOffValueSchema = Schema(
  {
    totalItemsCount: {
      type: String,

      default: "",
    },

    grandTotalResidualCostUah: {
      type: String,

      default: "",
    },

    // amountUah: {
    //   type: String,

    //   default: "",
    // },

    // currency: {
    //   type: String,

    //   default: "грн",
    // },
  },
  { _id: false },
);

const PropertySchema = Schema(
  {
    id: {
      type: String,

      required: true,
    },

    itemName: {
      type: String,

      default: "",
    },

    unitOfMeasurement: {
      type: String,

      default: "",
    },

    quantity: {
      type: String,

      default: "",
    },

    nomenclatureCode: {
      type: String,

      default: "",
    },

    category: {
      type: String,

      default: "",
    },

    technicalCondition: {
      type: String,

      default: "",
    },
    totalItemsCount: {
      type: String,

      default: "",
    },

    cost: CostSchema,

    // note: {
    //   type: String,

    //   default: "",
    // },
  },
  { _id: false },
);

const LostPropertySchema = Schema(
  {
    service: {
      type: String,

      default: "",
    },
    totalResidualCostUah: {
      type: String,

      default: "",
    },
    listOfProperty: [PropertySchema],
  },
  { _id: false },
);

//
// TEXT
//

const TextBlockSchema = Schema(
  {
    text: {
      type: String,

      default: "",
    },

    source: {
      type: String,

      default: "",
    },
  },
  { _id: false },
);

//
// COMMISSION
//

const CommissionMemberSchema = Schema(
  {
    id: {
      type: String,

      required: true,
    },

    position: {
      type: String,

      default: "",
    },

    rank: {
      type: String,

      default: "",
    },

    firstName: {
      type: String,

      default: "",
    },

    lastName: {
      type: String,

      default: "",
    },
  },
  { _id: false },
);

const CommissionSchema = Schema(
  {
    chairman: PersonSchema,

    members: [CommissionMemberSchema],
  },
  { _id: false },
);

//
// WITNESSES
//

const EventWitnessSchema = Schema(
  {
    id: {
      type: String,

      required: true,
    },

    position: {
      type: String,

      default: "",
    },

    rank: {
      type: String,

      default: "",
    },

    firstName: {
      type: String,

      default: "",
    },

    lastName: {
      type: String,

      default: "",
    },

    note: {
      type: String,

      default: "",
    },
  },
  { _id: false },
);

//
// SERVICE CHIEFS
//

const SupplyServiceChiefSchema = Schema(
  {
    id: {
      type: String,

      required: true,
    },

    service: {
      type: String,

      default: "",
    },

    position: {
      type: String,

      default: "",
    },

    rank: {
      type: String,

      default: "",
    },

    firstName: {
      type: String,

      default: "",
    },

    lastName: {
      type: String,

      default: "",
    },

    status: {
      type: String,

      enum: ["auto", "manual"],

      default: "auto",
    },
  },
  { _id: false },
);

//
// COPIES
//

const CopySchema = Schema(
  {
    copyNumber: {
      type: String,

      default: "",
    },

    recipient: {
      type: String,

      default: "",
    },
  },
  { _id: false },
);

const ActCopiesSchema = Schema(
  {
    count: {
      type: String,

      default: "",
    },

    copies: [CopySchema],
  },
  { _id: false },
);

//
// COMMANDER
//

const CommanderConclusionSchema = Schema(
  {
    text: {
      type: String,

      default: "",
    },

    position: {
      type: String,

      default: "",
    },

    rank: {
      type: String,

      default: "",
    },

    firstName: {
      type: String,

      default: "",
    },

    lastName: {
      type: String,

      default: "",
    },

    signatureDate: approvalDateSchema,
  },
  { _id: false },
);

//
// PRINT
//

const PrintSettingsSchema = Schema(
  {
    printMode: {
      type: String,

      default: "",
    },
  },
  { _id: false },
);

//
// DATA
//

const DocumentDataSchema = Schema(
  {
    approval: ApprovalSchema,

    accountingDetails: AccountingDetailsSchema,

    lostProperty: [LostPropertySchema],
    writeOffValue: WriteOffValueSchema,

    eventDescription: TextBlockSchema,

    eventConfirmation: TextBlockSchema,

    commissionConclusion: {
      type: String,

      default: "",
    },

    commission: CommissionSchema,

    eventWitnesses: [EventWitnessSchema],

    supplyServiceChiefs: [SupplyServiceChiefSchema],

    actCopies: ActCopiesSchema,

    commanderConclusion: CommanderConclusionSchema,
  },
  { _id: false },
);

//
// DOCUMENT
//

const ActDocumentSchema = Schema(
  {
    caseId: {
      type: String,

      required: true,

      index: true,
    },

    documentType: {
      type: String,

      required: true,

      enum: ["act"],
    },

    mode: {
      type: String,

      required: true,

      enum: ["with_armdoc", "docx_only"],
    },
    templateType: {
      type: String,
      enum: ["ACT_LANDSCAPE_V1", "ACT_LANDSCAPE_V2"],
      default: "ACT_LANDSCAPE_V1",
    },

    data: {
      type: DocumentDataSchema,

      required: true,
    },
    printSettings: PrintSettingsSchema,
  },
  { timestamps: true, versionKey: false },
);

const ActDocument = model("act", ActDocumentSchema);

module.exports = ActDocument;
