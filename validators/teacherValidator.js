const Joi = require("joi");

const teacherSchema = Joi.object({

  teacher_name: Joi.string().trim().required(),

  designation: Joi.string().trim().required(),

  phone: Joi.string().trim().required(),

  age: Joi.number().required(),

  gender: Joi.string()
    .valid("Male", "Female", "Other")
    .required()

});

module.exports = teacherSchema;