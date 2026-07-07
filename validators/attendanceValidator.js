const Joi = require("joi");

const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Leave"];

const attendanceSchema = Joi.object({
  student_id: Joi.number().integer().positive().required(),
  date: Joi.date().required(),
  period: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid(...ATTENDANCE_STATUSES)
    .required(),
});

const attendanceUpdateSchema = Joi.object({
  status: Joi.string()
    .valid(...ATTENDANCE_STATUSES)
    .required(),
});

const bulkAttendanceRecordSchema = Joi.object({
  student_id: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid(...ATTENDANCE_STATUSES)
    .required(),
  attendance_id: Joi.number().integer().positive().optional(),
});

const bulkAttendanceSchema = Joi.object({
  date: Joi.date().required(),
  period: Joi.number().integer().positive().required(),
  records: Joi.array().items(bulkAttendanceRecordSchema).min(1).required(),
});

module.exports = attendanceSchema;
module.exports.attendanceUpdateSchema = attendanceUpdateSchema;
module.exports.bulkAttendanceSchema = bulkAttendanceSchema;
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
