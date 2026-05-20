const Joi = require("joi");

const teacherSchema = Joi.object({
  teacher_name: Joi.string().trim().required(),
  designation: Joi.string().trim().required()
});

module.exports = teacherSchema;
