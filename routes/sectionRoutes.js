const express = require("express");
const router = express.Router();

const {
  createSection,
  getSections
} = require("../controllers/sectionController");

router.post("/", createSection);

router.get("/", getSections);

module.exports = router;