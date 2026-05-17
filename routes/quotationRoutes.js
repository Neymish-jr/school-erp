const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {

  try {

    const {
      expense_id,
      vendor_name,
      quotation_amount
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO quotations
      (
        expense_id,
        vendor_name,
        quotation_amount
      )

      VALUES ($1, $2, $3)

      RETURNING *
      `,
      [
        expense_id,
        vendor_name,
        quotation_amount
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error adding quotation");

  }

});

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT * FROM quotations
      ORDER BY quotation_amount ASC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error fetching quotations");

  }

});
router.put("/:id/select", async (req, res) => {

  try {

    const { id } = req.params;

    // reset all selections
    await pool.query(
      `
      UPDATE quotations
      SET is_selected = false
      `
    );

    // select chosen quotation
    const result = await pool.query(
      `
      UPDATE quotations
      SET is_selected = true
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).send("Selection failed");

  }

});
module.exports = router;