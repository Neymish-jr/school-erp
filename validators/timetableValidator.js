const Joi = require("joi");

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const validDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const timetableSchema = Joi.object({
  class_section_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "number.base":
        "Class section ID must be a number",

      "number.integer":
        "Class section ID must be an integer",

      "number.positive":
        "Class section ID must be greater than 0",

      "any.required":
        "Class section ID is required",
    }),

  subject_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "number.base":
        "Subject ID must be a number",

      "number.integer":
        "Subject ID must be an integer",

      "number.positive":
        "Subject ID must be greater than 0",

      "any.required":
        "Subject ID is required",
    }),

  teacher_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "number.base":
        "Teacher ID must be a number",

      "number.integer":
        "Teacher ID must be an integer",

      "number.positive":
        "Teacher ID must be greater than 0",

      "any.required":
        "Teacher ID is required",
    }),

  day: Joi.string()
    .trim()
    .lowercase()
    .valid(...validDays)
    .required()
    .messages({
      "string.empty":
        "Day is required",

      "any.only":
        `Day must be one of: ${validDays.join(", ")}`,

      "any.required":
        "Day is required",
    }),

  period_number: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      "number.base":
        "Period number must be a number",

      "number.integer":
        "Period number must be an integer",

      "number.min":
        "Period number must be at least 1",

      "number.max":
        "Period number cannot exceed 12",

      "any.required":
        "Period number is required",
    }),

  start_time: Joi.string()
    .trim()
    .pattern(timePattern)
    .required()
    .messages({
      "string.pattern.base":
        "start_time must be in HH:MM format",

      "any.required":
        "start_time is required",
    }),

  end_time: Joi.string()
    .trim()
    .pattern(timePattern)
    .required()
    .messages({
      "string.pattern.base":
        "end_time must be in HH:MM format",

      "any.required":
        "end_time is required",
    }),
})
  .custom((value, helpers) => {

    if (value.start_time >= value.end_time) {
      return helpers.message(
        "End time must be later than start time"
      );
    }

    return value;
  })

  .required();

module.exports = timetableSchema;