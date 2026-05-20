const express = require("express");
const router = express.Router();
const { validateRequest } = require("../middleware/validation");
const quotationSchema = require("../validators/quotationValidator");
const {
  createQuotation,
  getQuotations,
  selectQuotation
} = require("../controllers/quotationController");

router.post(
  "/",
  validateRequest(quotationSchema),
  createQuotation
);

router.get("/", getQuotations);
router.put("/:id/select", selectQuotation);
module.exports = router;