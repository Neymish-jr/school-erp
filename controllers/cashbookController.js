const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

// GET CASHBOOK
const getCashbook = async (req, res) => {
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

    return successResponse(res, { data: result.rows });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching cashbook", error: err.message, status: 500 });

  }
};

module.exports = {
  getCashbook
};
