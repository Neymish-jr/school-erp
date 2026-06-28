const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require("../utils/response");
const { buildJwtPayload } = require("../utils/teacherIdentity");

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, school_id: bodySchoolId } = req.body;

    const schoolId = bodySchoolId != null ? Number(bodySchoolId) : req.user?.school_id;

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return errorResponse(res, {
        message: "Valid school_id is required",
        error: "Valid school_id is required",
        status: 400,
      });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return errorResponse(res, { message: "Email already exists", error: "Email already exists", status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, email, hashedPassword, role, schoolId]
    );

    return successResponse(res, { data: result.rows[0] });
  } catch (err) {
    console.error(err);

    if (err.code === "23503") {
      return errorResponse(res, {
        message: "Invalid school ID",
        error: "Invalid school ID",
        status: 400,
      });
    }

    return errorResponse(res, { message: "Error creating user", error: err.message, status: 500 });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query(
      `
      SELECT id, name, email, password, role, school_id, teacher_id
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (user.rows.length === 0) {
      return errorResponse(res, { message: "User not found", error: "User not found", status: 400 });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return errorResponse(res, { message: "Invalid password", error: "Invalid password", status: 400 });
    }

    const tokenPayload = buildJwtPayload(user.rows[0]);

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return successResponse(res, {
      data: {
        token,
        user: {
          id: user.rows[0].id,
          name: user.rows[0].name,
          role: user.rows[0].role,
          teacher_id: tokenPayload.teacher_id,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, { message: "Login error", error: err.message, status: 500 });
  }
};

module.exports = {
  registerUser,
  loginUser
};
