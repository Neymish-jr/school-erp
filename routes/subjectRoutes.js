const express = require("express");
const router = express.Router();

const {
  createSubject,
  getSubjects
} = require("../controllers/subjectController");

router.post("/", createSubject);

router.get("/", getSubjects);

module.exports = router;