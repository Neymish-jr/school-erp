const express = require("express");
const router = express.Router();

const pool = require("../db");

const multer = require("multer");
const XLSX = require("xlsx");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

router.post(
  "/students",
  upload.single("file"),

  async (req, res) => {

    try {

      const workbook = XLSX.readFile(req.file.path);

      const sheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];

      const data = XLSX.utils.sheet_to_json(worksheet);
      console.log(data);

      for (const row of data) {

        await pool.query(
          `
          INSERT INTO students
          (
            name,
            gender,
            category,
            student_class,
            section,
            school_id
          )

          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            row.Name,
            row.Gender,
            row["Social Category"],
            row.Class,
            row.Section,
            1
          ]
        );

      }

      res.json({
        success: true,
        message: "Students imported successfully"
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message: "Error uploading file"
      });

    }

  }
);

module.exports = router;