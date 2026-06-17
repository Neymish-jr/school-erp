const express = require("express");
const router = express.Router();
const {
    authenticate,
    isAdminLike
  } = require("../middleware/auth");
const { getCashbook } = require("../controllers/cashbookController");
router.use(
    authenticate,
    isAdminLike
  );
router.get("/", getCashbook);

module.exports = router;