const Joi = require("joi");

const studentSchema = Joi.object({
  name: Joi.string().min(2).required(),

  gender: Joi.string()
    .valid("Male", "Female", "Other")
    .required(),

  category: Joi.string().allow(null, ""),

  student_class: Joi.string().required(),

  section: Joi.string().required()
});

module.exports = studentSchema;