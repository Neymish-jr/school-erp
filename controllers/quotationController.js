const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

// CREATE QUOTATION
const createQuotation = async (req, res) => {
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

    return successResponse(res, { data: result.rows[0] });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error adding quotation", error: err.message, status: 500 });

  }
};

// GET QUOTATIONS
const getQuotations = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM quotations
      ORDER BY quotation_amount ASC
      `
    );

    return successResponse(res, { data: result.rows });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching quotations", error: err.message, status: 500 });

  }
};

// SELECT QUOTATION
const selectQuotation = async (req, res) => {
  try {
    const { id } = req.params;

    // reset all selections
    await pool.query(`
      UPDATE quotations
      SET is_selected = false
      `);

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

    return successResponse(res, { data: result.rows[0] });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Selection failed", error: err.message, status: 500 });

  }
};

module.exports = {
  createQuotation,
  getQuotations,
  selectQuotation
};
