const express = require("express");
const router = express.Router();

const {
  createExam,
  getExams
} = require("../controllers/examController");

router.post("/", createExam);

router.get("/", getExams);

module.exports = router;