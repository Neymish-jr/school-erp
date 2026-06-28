const express = require("express");
const router = express.Router();

const multer = require("multer");
const { importStudents } = require("../controllers/studentImportController");
const {
  authenticate,
  isAdminLike,
} = require("../middleware/auth");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post(
  "/students",
  authenticate,
  isAdminLike,
  upload.single("file"),
  importStudents
);

module.exports = router;
