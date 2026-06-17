const express = require("express");
const router = express.Router();
const {
    authenticate,
    isAdminLike
  } = require("../middleware/auth");

const { getStockRegister } = require("../controllers/stockController");
router.use(
  authenticate,
  isAdminLike
);
router.get("/", getStockRegister);

module.exports = router;