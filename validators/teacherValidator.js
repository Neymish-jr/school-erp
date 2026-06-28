const Joi = require("joi");
const { TEACHER_STATUSES } = require("../constants/teacherStatus");

const teacherSchema = Joi.object({

  teacher_name: Joi.string().trim().required(),

  designation: Joi.string().trim().required(),

  phone: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required(),

  age: Joi.number()
    .min(18)
    .max(65)
    .required(),

  gender: Joi.string()
    .valid("Male", "Female", "Other")
    .required(),

  employee_code: Joi.string().trim().max(50).allow(null, "").optional(),

});

const teacherUpdateSchema = Joi.object({
  teacher_name: Joi.string().trim(),
  email: Joi.string().trim().email().allow("", null),
  phone: Joi.string().length(10).pattern(/^[0-9]+$/),
  subject: Joi.string().trim().allow("", null),
  qualification: Joi.string().trim().allow("", null),
  gender: Joi.string().valid("Male", "Female", "Other"),
  status: Joi.string().valid(...TEACHER_STATUSES),
  designation: Joi.string().trim(),
  age: Joi.number().min(18).max(65),
  employee_code: Joi.string().trim().max(50).allow(null, ""),
}).min(1);

module.exports = teacherSchema;
module.exports.teacherUpdateSchema = teacherUpdateSchema;
module.exports.TEACHER_STATUSES = TEACHER_STATUSES;