const schoolService = require("../services/schoolService");
const { successResponse } = require("../utils/response");

const listSchools = async (req, res) => {
  const data = await schoolService.listSchools();

  return successResponse(res, {
    message: "Schools fetched successfully",
    data,
  });
};

module.exports = {
  listSchools,
};
