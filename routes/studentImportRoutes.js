const express = require("express");
const multer = require("multer");

const {
  importStudents,
  downloadTemplate,
  exportStudents,
} = require("../controllers/studentImportController");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.post(
  "/",
  upload.single("file"),
  importStudents
);

router.get(
  "/template",
  downloadTemplate
);

router.get(
  "/export",
  exportStudents
);

module.exports = router;