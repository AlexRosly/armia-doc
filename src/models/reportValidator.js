// const Joi = require("joi");

// module.exports = Joi.object({
//   caseId: Joi.string().required(),

//   documentType: Joi.string().valid("report").required(),

//   mode: Joi.string().valid("with_armdoc", "docx_only").required(),

//   data: Joi.object({
//     documentDetails: Joi.object({
//       recipient: Joi.string().required(),
//       documentTitle: Joi.string().required(),
//     }),

//     eventDescription: Joi.object({
//       text: Joi.string().required(),
//     }),

//     lostProperty: Joi.array().min(1).required(),

//     requestPart: Joi.object({
//       text: Joi.string().required(),
//     }),

//     signer: Joi.object({
//       position: Joi.string().required(),
//       militaryUnit: Joi.string().required(),
//       rank: Joi.string().required(),
//       fullName: Joi.string().required(),
//       date: Joi.date().required(),
//     }),
//   }).required(),
// });
// const Joi = require("joi");

// const lostPropertySchema = Joi.object({
//   id: Joi.string().required(),

//   service: Joi.string().required(),

//   unit: Joi.string().allow("").optional(),

//   itemName: Joi.string().required(),

//   identification: Joi.string().allow("").optional(),

//   manufactureYear: Joi.string().allow("").optional(),

//   quantity: Joi.alternatives().try(Joi.string(), Joi.number()).required(),

//   note: Joi.string().allow("").optional(),
// });

// module.exports = Joi.object({
//   caseId: Joi.string().required(),

//   documentType: Joi.string().valid("report").required(),

//   mode: Joi.string().valid("with_armdoc", "docx_only").required(),

//   data: Joi.object({
//     documentDetails: Joi.object({
//       recipient: Joi.string().required(),
//       documentTitle: Joi.string().required(),
//     }).required(),

//     eventDescription: Joi.object({
//       text: Joi.string().required(),
//     }).required(),

//     lostProperty: Joi.array().items(lostPropertySchema).min(1).required(),

//     specialPropertyCases: Joi.object({
//       status: Joi.string()
//         .valid("none", "found", "destroyed", "damaged", "other")
//         .required(),

//       text: Joi.string().allow("").optional(),
//     }).optional(),

//     valuationAndGrounds: Joi.object({
//       text: Joi.string().allow("").optional(),
//     }).optional(),

//     lossCircumstances: Joi.object({
//       text: Joi.string().allow("").optional(),
//     }).optional(),

//     additionalInfo: Joi.object({
//       text: Joi.string().allow("").optional(),
//     }).optional(),

//     requestPart: Joi.object({
//       text: Joi.string().required(),
//     }).required(),

//     signer: Joi.object({
//       position: Joi.string().required(),

//       militaryUnit: Joi.string().required(),

//       rank: Joi.string().required(),

//       fullName: Joi.string().required(),

//       date: Joi.string()
//         .pattern(/^\d{4}-\d{2}-\d{2}$/)
//         .required(),
//     }).required(),
//   }).required(),
// });
const propertySchema = Joi.object({
  id: Joi.string().required(),

  itemName: Joi.string().required(),

  unitOfMeasurement: Joi.string().required(),

  quantity: Joi.alternatives().try(Joi.string(), Joi.number()).required(),

  manufactureYear: Joi.string().allow("").optional(),
});

const subDivisionSchema = Joi.object({
  subDivision: Joi.string().required(),

  listOfProperty: Joi.array().items(propertySchema).min(1).required(),
});

const lostPropertySchema = Joi.object({
  service: Joi.string().required(),

  subDivisions: Joi.array().items(subDivisionSchema).min(1).required(),
});
