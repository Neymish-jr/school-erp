const Joi = require("joi");

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
    .required()

});

module.exports = teacherSchema;