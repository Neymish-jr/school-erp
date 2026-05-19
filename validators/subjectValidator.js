const Joi = require("joi");

const subjectSchema = Joi.object({

  subject_name: Joi.string().required(),

  subject_code: Joi.string().required(),

  class_id: Joi.number().required(),

  teacher_id: Joi.number().required()

});

module.exports = subjectSchema;