const express = require("express");
const multer = require("multer");

const {
  importStudents,
  downloadTemplate,
  exportStudents,
} = require("../controllers/studentImportController");

const router = express.Router();

const {
  authenticate,
  isAdminLike
} = require("../middleware/auth");

const upload = multer({
  dest: "uploads/",
});

router.post(
  "/",
  authenticate,
  isAdminLike,
  upload.single("file"),
  importStudents
);

router.get(
  "/template",
  authenticate,
  isAdminLike,
  downloadTemplate
);

router.get(
  "/export",
  authenticate,
  isAdminLike,
  exportStudents
);

module.exports = router;