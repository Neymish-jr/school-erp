const pool = require("../db");
const expenseSchema = require("../validators/expenseValidator");

// CREATE EXPENSE
const createExpense = async (req, res) => {

  const { error } = expenseSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {

    const {
      title,
      amount,
      category,
      date
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO expenses
      (title, amount, category, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        title,
        amount,
        category,
        date
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error creating expense"
    });

  }

};

module.exports = {
  createExpense
};