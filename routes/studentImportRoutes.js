const express = require("express");
const multer = require("multer");

const {
  importStudents,
  downloadTemplate,
  exportStudents,
} = require("../controllers/studentImportController");

const router = express.Router();

const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const upload = multer({
  dest: "uploads/",
});

router.post(
  "/",
  authenticate,
  authorize("student.import.execute"),
  upload.single("file"),
  importStudents
);

router.get(
  "/template",
  authenticate,
  authorize("student.import.template"),
  downloadTemplate
);

router.get(
  "/export",
  authenticate,
  authorize("student.export.execute"),
  exportStudents
);

module.exports = router;
