const Joi = require("joi");

const sectionSchema = Joi.object({

  section_name: Joi.string().required(),

  class_id: Joi.number().required(),

  class_teacher_id: Joi.number().required()

});

module.exports = sectionSchema;