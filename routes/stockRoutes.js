const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT * FROM stock_register
      ORDER BY created_at DESC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error fetching stock register");

  }

});

module.exports = router;