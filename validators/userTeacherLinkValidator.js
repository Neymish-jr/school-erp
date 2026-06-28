const Joi = require("joi");

const linkUserTeacherSchema = Joi.object({
  teacher_id: Joi.number().integer().positive().required().messages({
    "any.required": "teacher_id is required",
    "number.base": "teacher_id must be a number",
    "number.positive": "teacher_id must be a positive integer",
  }),
});

module.exports = {
  linkUserTeacherSchema,
};
