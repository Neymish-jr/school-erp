const { body, validationResult } = require("express-validator");

const validateRegister = [
  body("name").notEmpty().withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Valid email required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("role")
    .isIn(["admin", "teacher"])
    .withMessage("Invalid role"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    next();
  }
];

const validateRequest = (schema, options = {}) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const message = error.details[0].message;

      if (options.useTextResponse) {
        return res.status(400).send(message);
      }

      return res.status(400).json({
        error: message
      });
    }

    next();
  };
};

module.exports = {
  validateRegister,
  validateRequest
};