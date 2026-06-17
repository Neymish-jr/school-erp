const Joi = require("joi");

const financialYearCreateSchema = Joi.object({
  year_label: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      "string.empty": "Financial year label is required",
      "string.pattern.base": "Financial year label must be in YYYY-YY format (e.g. 2026-27)",
      "any.required": "Financial year label is required",
    }),
  remarks: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Remarks must be at most 500 characters",
  }),
}).required();

const financialYearUpdateSchema = Joi.object({
  remarks: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Remarks must be at most 500 characters",
  }),
}).required();

module.exports = {
  financialYearCreateSchema,
  financialYearUpdateSchema,
};
