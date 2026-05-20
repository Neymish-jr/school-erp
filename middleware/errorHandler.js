const { errorResponse } = require("../utils/response");

const errorHandler = (err, req, res, next) => {

  console.error(err.stack);

  const statusCode = err.statusCode || 500;

  return errorResponse(res, {
    message: err.message || "Internal Server Error",
    error: err.stack,
    status: statusCode
  });

};

module.exports = errorHandler;