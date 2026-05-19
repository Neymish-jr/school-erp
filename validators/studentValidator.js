const Joi = require("joi");

const studentSchema = Joi.object({

  name: Joi.string().min(2).required(),

  gender: Joi.string()
    .valid("Male", "Female", "Other")
    .required(),

  category: Joi.string().required(),

  student_class: Joi.string().required(),

  section: Joi.string().required(),

  school_id: Joi.number().required()

});

module.exports = studentSchema;