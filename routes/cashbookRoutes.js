const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        payment_date,
        voucher_no,
        item_name,
        amount,
        vendor_name,
        transaction_id

      FROM expenses

      WHERE status = 'Paid'

      ORDER BY payment_date ASC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error fetching cashbook");

  }

});

module.exports = router;