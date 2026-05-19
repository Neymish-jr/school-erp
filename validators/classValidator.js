const Joi = require("joi");

const classSchema = Joi.object({

  class_name: Joi.string()
    .min(1)
    .required()

});

module.exports = classSchema;