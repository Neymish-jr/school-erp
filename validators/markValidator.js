const Joi = require("joi");

const markSchema = Joi.object({

  student_id: Joi.number().required(),

  subject_id: Joi.number().required(),

  exam_id: Joi.number().required(),

  marks_obtained: Joi.number()
    .min(0)
    .required(),

  total_marks: Joi.number()
    .greater(Joi.ref("marks_obtained"))
    .required()

});

module.exports = markSchema;