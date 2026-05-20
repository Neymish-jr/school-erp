const express = require("express");
const router = express.Router();
const { getStockRegister } = require("../controllers/stockController");

router.get("/", getStockRegister);

module.exports = router;