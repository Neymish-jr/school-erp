const express = require("express");
const router = express.Router();

const {
  getClasses,
  createClass
} = require("../controllers/classController");

// CREATE CLASS
router.post("/", createClass);

// GET ALL CLASSES
router.get("/", getClasses);

module.exports = router;