const Joi = require("joi");

const subjectSchema = Joi.object({
  subject_name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Subject name is required",
    "string.min": "Subject name must be at least 2 characters",
    "string.max": "Subject name must be at most 100 characters",
    "any.required": "Subject name is required",
  }),
  applicable_classes: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      "array.base": "Applicable classes are required",
      "array.min": "Select at least one applicable class",
      "any.required": "Applicable classes are required",
    }),
}).required();

module.exports = subjectSchema;