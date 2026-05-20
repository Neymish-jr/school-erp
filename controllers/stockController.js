const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

// GET STOCK REGISTER
const getStockRegister = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM stock_register
      ORDER BY created_at DESC
      `
    );

    return successResponse(res, { data: result.rows });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching stock register", error: err.message, status: 500 });

  }
};

module.exports = {
  getStockRegister
};
