const express = require("express");
const router = express.Router();
const { getCashbook } = require("../controllers/cashbookController");

router.get("/", getCashbook);

module.exports = router;