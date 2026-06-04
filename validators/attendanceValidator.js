const Joi = require("joi");

const attendanceSchema = Joi.object({

  student_id: Joi.number().required(),

  date: Joi.date().required(),

  period: Joi.number().required(),

  status: Joi.string()
    .valid("Present", "Absent", "Late", "Leave")
    .required()

});

module.exports = attendanceSchema;