const pool = require("../db");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

exports.getAllStaffPosts = asyncHandler(async (req, res, next) => {
  const { search, staff_category, page = 1, limit = 10 } = req.query;
  const { school_id } = req.user;
  const offset = (page - 1) * limit;

  let query = `SELECT id, post_name, post_code, staff_category, appointment_nature, sanctioned_count, created_at, updated_at FROM staff_posts WHERE school_id = $1`;
  let countQuery = `SELECT COUNT(*) FROM staff_posts WHERE school_id = $1`;
  const queryParams = [school_id];
  const countParams = [school_id];

  const conditions = [];

  if (search) {
    conditions.push(`(post_name ILIKE $${queryParams.length + 1} OR post_code ILIKE $${queryParams.length + 2})`);
    queryParams.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (staff_category) {
    conditions.push(`staff_category = $${queryParams.length + 1}`);
    queryParams.push(staff_category);
    countParams.push(staff_category);
  }

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(" AND ")}`;
    countQuery += ` AND ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(limit, offset);

  const { rows: staffPosts } = await pool.query(query, queryParams);
  const { rows: [{"count": totalCount}] } = await pool.query(countQuery, countParams);

  res.status(200).json({
    status: "success",
    total: parseInt(totalCount),
    page: parseInt(page),
    limit: parseInt(limit),
    data: staffPosts,
  });
});

exports.getStaffPostById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { school_id } = req.user;
  const { rows: staffPost } = await pool.query("SELECT id, post_name, post_code, staff_category, appointment_nature, sanctioned_count, created_at, updated_at FROM staff_posts WHERE id = $1 AND school_id = $2", [id, school_id]);

  if (!staffPost.length) {
    return next(new AppError("Staff post not found in your school", 404));
  }

  res.status(200).json({
    status: "success",
    data: staffPost[0],
  });
});

exports.createStaffPost = asyncHandler(async (req, res, next) => {
  const { post_name, post_code, staff_category, appointment_nature, sanctioned_count } = req.body;
  const { school_id } = req.user; // Get school_id from authenticated user

  const { rows: newStaffPost } = await pool.query(
    "INSERT INTO staff_posts (school_id, post_name, post_code, staff_category, appointment_nature, sanctioned_count) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, post_name, post_code, staff_category, appointment_nature, sanctioned_count, created_at, updated_at",
    [school_id, post_name, post_code, staff_category, appointment_nature, sanctioned_count]
  );

  res.status(201).json({
    status: "success",
    data: newStaffPost[0],
  });
});

exports.updateStaffPost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { school_id } = req.user;
  const { post_name, post_code, staff_category, appointment_nature, sanctioned_count } = req.body;

  const { rows: updatedStaffPost } = await pool.query(
    "UPDATE staff_posts SET post_name = $1, post_code = $2, staff_category = $3, appointment_nature = $4, sanctioned_count = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND school_id = $7 RETURNING id, post_name, post_code, staff_category, appointment_nature, sanctioned_count, created_at, updated_at",
    [post_name, post_code, staff_category, appointment_nature, sanctioned_count, id, school_id]
  );

  if (!updatedStaffPost.length) {
    return next(new AppError("Staff post not found in your school", 404));
  }

  res.status(200).json({
    status: "success",
    data: updatedStaffPost[0],
  });
});

exports.deleteStaffPost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { school_id } = req.user;

  const { rowCount } = await pool.query("DELETE FROM staff_posts WHERE id = $1 AND school_id = $2", [id, school_id]);

  if (rowCount === 0) {
    return next(new AppError("Staff post not found in your school", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Dashboard Widgets
exports.getTotalStaffPosts = asyncHandler(async (req, res) => {
  const { school_id } = req.user;
  const { rows } = await pool.query("SELECT COUNT(*) FROM staff_posts WHERE school_id = $1", [school_id]);
  res.status(200).json({
    status: "success",
    data: parseInt(rows[0].count),
  });
});

exports.getTotalSanctionedStrength = asyncHandler(async (req, res) => {
  const { school_id } = req.user;
  const { rows } = await pool.query("SELECT SUM(sanctioned_count) FROM staff_posts WHERE school_id = $1", [school_id]);
  res.status(200).json({
    status: "success",
    data: parseInt(rows[0].sum || 0),
  });
});

exports.getFilledPositions = asyncHandler(async (req, res) => {
  const { school_id } = req.user;
  const { rows } = await pool.query("SELECT COUNT(*) FROM teacher_staff_post_assignments WHERE is_active = TRUE AND school_id = $1", [school_id]);
  res.status(200).json({
    status: "success",
    data: parseInt(rows[0].count),
  });
});

exports.getVacantPositions = asyncHandler(async (req, res) => {
  const { school_id } = req.user;
  const { rows: totalSanctioned } = await pool.query("SELECT SUM(sanctioned_count) FROM staff_posts WHERE school_id = $1", [school_id]);
  const { rows: filledPositions } = await pool.query("SELECT COUNT(*) FROM teacher_staff_post_assignments WHERE is_active = TRUE AND school_id = $1", [school_id]);

  const total = parseInt(totalSanctioned[0].sum || 0);
  const filled = parseInt(filledPositions[0].count);
  const vacant = total - filled;

  res.status(200).json({
    status: "success",
    data: vacant,
  });
});
