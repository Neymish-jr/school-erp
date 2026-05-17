const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {

  try {

    const {
      activity_id,
      item_name,
      quantity,
      amount,
      vendor_name,
    } = req.body;
    if (
      !activity_id ||
      !item_name ||
      !quantity ||
      !amount ||
      !vendor_name
    ) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    if (quantity <= 0 || amount <= 0) {
      return res.status(400).json({
        error: "Invalid quantity or amount"
      });
    }
    const result = await pool.query(
      `
      INSERT INTO expenses
      (
        activity_id,
        item_name,
        quantity,
        amount,
        vendor_name,
        status
      )

      VALUES ($1, $2, $3, $4, $5, $6)

      RETURNING *
      `,
      [
        activity_id,
        item_name,
        quantity,
        amount,
        vendor_name,
        "Pending"
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error adding expense");

  }

});

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT

      expenses.*,

      activities.activity_name

      FROM expenses

      LEFT JOIN activities
      ON expenses.activity_id = activities.id

      ORDER BY expenses.id DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error fetching expenses");

  }

});

router.put("/:id/approve", async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE expenses
      SET
        status = 'Approved',
        approved_by_principal = true
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).send("Approval failed");

  }

});

router.put("/:id/verify-payment", async (req, res) => {

  try {

    const { id } = req.params;

    const {
      payment_date,
      voucher_no,
      transaction_id
    } = req.body;
    const existingExpense = await pool.query(
      `
      SELECT * FROM expenses
      WHERE id = $1
      `,
      [id]
    );

    if (existingExpense.rows.length === 0) {
      return res.status(404).send("Expense not found");
    }

    if (existingExpense.rows[0].verified_by_office) {
      return res.status(400).send("Payment already verified");
    }
    const expenseResult = await pool.query(
      `
      UPDATE expenses
      SET
        payment_date = $1,
        voucher_no = $2,
        transaction_id = $3,
        verified_by_office = true,
        status = 'Paid'
      WHERE id = $4
      RETURNING *
      `,
      [
        payment_date,
        voucher_no,
        transaction_id,
        id
      ]
    );

    const expense = expenseResult.rows[0];

    // AUTO STOCK ENTRY
    await pool.query(
      `
      INSERT INTO stock_register
      (
        item_name,
        quantity_in,
        balance,
        linked_expense_id
      )

      VALUES ($1, $2, $3, $4)
      `,
      [
        expense.item_name,
        expense.quantity,
        expense.quantity,
        expense.id
      ]
    );

    res.json({
      message: "Payment verified and stock updated",
      expense
    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Payment verification failed");

  }

});

module.exports = router;