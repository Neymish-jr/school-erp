const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const CATEGORY_PREFIXES = {
  Teaching: "TCH",
  Administrative: "ADM",
  Office: "OFF",
  Support: "SUP",
  Contractual: "CON",
};

const normalizePostPayload = (payload = {}) => ({
  post_name: String(payload.post_name || "").trim(),
  staff_category: String(payload.staff_category || "").trim(),
  appointment_nature: String(payload.appointment_nature || "").trim(),
  is_teaching_post: Boolean(payload.is_teaching_post),
  sanctioned_count: Number(payload.sanctioned_count || 0),
});

const getSchoolId = (req) => req.user?.school_id || 1;

const generatePostCode = async (schoolId, category) => {
  const prefix = CATEGORY_PREFIXES[category] || "PST";

  const result = await pool.query(
    `
    SELECT post_code
    FROM staff_posts
    WHERE school_id = $1
      AND post_code ILIKE $2
    `,
    [schoolId, `${prefix}%`]
  );

  let maxSequence = 0;

  result.rows.forEach((row) => {
    const match = String(row.post_code || "").match(new RegExp(`^${prefix}(\\d{1,6})$`));

    if (match) {
      const parsed = Number(match[1]);

      if (Number.isInteger(parsed) && parsed > maxSequence) {
        maxSequence = parsed;
      }
    }
  });

  return `${prefix}${String(maxSequence + 1).padStart(3, "0")}`;
};

const getStaffPosts = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const search = String(req.query.search || "").trim();
    const staffCategory = String(req.query.staff_category || "").trim();
    const isActive = req.query.is_active;

    const params = [schoolId, `%${search}%`];

    let query = `
      SELECT
        id,
        school_id,
        post_code,
        post_name,
        staff_category,
        appointment_nature,
        is_teaching_post,
        sanctioned_count,
        is_active,
        created_at,
        updated_at
      FROM staff_posts
      WHERE school_id = $1
        AND (
          post_name ILIKE $2
          OR post_code ILIKE $2
        )
    `;

    if (staffCategory) {
      params.push(staffCategory);
      query += ` AND staff_category = $${params.length}`;
    }

    if (isActive === "true" || isActive === "false") {
      params.push(isActive === "true");
      query += ` AND is_active = $${params.length}`;
    }

    query += `
      ORDER BY is_active DESC, staff_category ASC, post_name ASC
    `;

    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Staff posts fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching staff posts",
      error: err.message,
      status: 500,
    });
  }
};

const getStaffPostById = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM staff_posts
      WHERE id = $1
        AND school_id = $2
      `,
      [req.params.id, getSchoolId(req)]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Staff post not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Staff post fetched successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching staff post",
      error: err.message,
      status: 500,
    });
  }
};

const createStaffPost = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = normalizePostPayload(req.body);
    const postCode = await generatePostCode(schoolId, payload.staff_category);

    const result = await pool.query(
      `
      INSERT INTO staff_posts (
        school_id,
        post_code,
        post_name,
        post_category,
        staff_category,
        appointment_nature,
        is_teaching_post,
        sanctioned_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        schoolId,
        postCode,
        payload.post_name,
        payload.staff_category,
        payload.staff_category,
        payload.appointment_nature,
        payload.is_teaching_post,
        payload.sanctioned_count
      ]
    );

    return successResponse(res, {
      message: "Staff post created successfully",
      data: result.rows[0],
      status: 201,
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "A staff post with this name already exists",
        error: "Duplicate staff post",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error creating staff post",
      error: err.message,
      status: 500,
    });
  }
};

const updateStaffPost = async (req, res) => {
  try {
    const payload = normalizePostPayload(req.body);

    const result = await pool.query(
      `
      UPDATE staff_posts
      SET
        post_name = $1,
        staff_category = $2,
        appointment_nature = $3,
        is_teaching_post = $4,
        sanctioned_count = $5,
        updated_at = NOW()
      WHERE id = $6
        AND school_id = $7
      RETURNING *
      `,
      [
        payload.post_name,
        payload.staff_category,
        payload.appointment_nature,
        payload.is_teaching_post,
        payload.sanctioned_count,
        req.params.id,
        getSchoolId(req),
      ]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Staff post not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Staff post updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "A staff post with this name already exists",
        error: "Duplicate staff post",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error updating staff post",
      error: err.message,
      status: 500,
    });
  }
};

const deactivateStaffPost = async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE staff_posts
      SET is_active = false,
          updated_at = NOW()
      WHERE id = $1
        AND school_id = $2
      RETURNING *
      `,
      [req.params.id, getSchoolId(req)]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Staff post not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Staff post deactivated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error deactivating staff post",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getStaffPosts,
  getStaffPostById,
  createStaffPost,
  updateStaffPost,
  deactivateStaffPost,
};
