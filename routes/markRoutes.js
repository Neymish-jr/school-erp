const express = require("express");
const router = express.Router();

const {
  createMark,
  getMarks
} = require("../controllers/markController");

router.post("/", createMark);

router.get("/", getMarks);

module.exports = router;