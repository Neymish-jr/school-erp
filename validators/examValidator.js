const Joi = require("joi");

const examSchema = Joi.object({

  exam_name: Joi.string().required(),

  class_id: Joi.number().required(),

  exam_type: Joi.string().required(),

  start_date: Joi.date().required(),

  end_date: Joi.date().required(),

  total_marks: Joi.number()
    .min(1)
    .required()

});

module.exports = examSchema;