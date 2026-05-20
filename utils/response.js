function successResponse(res, { message = '', data = null, status = 200 } = {}) {
  return res.status(status).json({
    success: true,
    message,
    data,
    error: null
  });
}

function errorResponse(res, { message = '', error = null, status = 500 } = {}) {
  return res.status(status).json({
    success: false,
    message,
    data: null,
    error
  });
}

module.exports = {
  successResponse,
  errorResponse
};
