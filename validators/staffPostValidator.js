const { body, param } = require("express-validator");

exports.createStaffPostValidation = [
  body("post_name")
    .notEmpty()
    .withMessage("Post name is required")
    .isString()
    .withMessage("Post name must be a string")
    .trim(),
  body("post_code")
    .notEmpty()
    .withMessage("Post code is required")
    .isString()
    .withMessage("Post code must be a string")
    .trim()
    .toUpperCase(),
  body("staff_category")
    .notEmpty()
    .withMessage("Staff category is required")
    .isIn(["Teaching", "Administrative", "Office", "Support", "Contractual"])
    .withMessage("Staff category must be one of the allowed values"),
  body("appointment_nature")
    .notEmpty()
    .withMessage("Appointment nature is required")
    .isIn(["Permanent", "Temporary", "Contractual", "Part-time", "Outsourced", "Deputation"])
    .withMessage("Appointment nature must be one of the allowed values"),
  body("sanctioned_count")
    .notEmpty()
    .withMessage("Sanctioned count is required")
    .isInt({ min: 0 })
    .withMessage("Sanctioned count must be a non-negative integer"),
];

exports.updateStaffPostValidation = [
  param("id").isInt().withMessage("ID must be an integer"),
  body("post_name")
    .optional()
    .isString()
    .withMessage("Post name must be a string")
    .trim(),
  body("post_code")
    .optional()
    .isString()
    .withMessage("Post code must be a string")
    .trim()
    .toUpperCase(),
  body("staff_category")
    .optional()
    .isIn(["Teaching", "Administrative", "Office", "Support", "Contractual"])
    .withMessage("Staff category must be one of the allowed values"),
  body("appointment_nature")
    .optional()
    .isIn(["Permanent", "Temporary", "Contractual", "Part-time", "Outsourced", "Deputation"])
    .withMessage("Appointment nature must be one of the allowed values"),
  body("sanctioned_count")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sanctioned count must be a non-negative integer"),
];

exports.getStaffPostByIdValidation = [
  param("id").isInt().withMessage("ID must be an integer"),
];

exports.deleteStaffPostValidation = [
  param("id").isInt().withMessage("ID must be an integer"),
];