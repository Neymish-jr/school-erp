const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const express = require("express");
const app = express();
const pool = require("./db");

app.use(express.json());
// 👇 ADD THIS HERE
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) return res.status(401).send("No token");

  const token = authHeader.split(" ")[1];

  try {
    const user = jwt.verify(token, "secretkey");
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).send("Invalid token");
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Access denied");
  }
  next();
};
app.get("/", (req, res) => {
  res.send("ERP Backend Running 🚀");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// REGISTER
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, email, hashedPassword, role, 1]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating user");
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).send("User not found");
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return res.status(400).send("Invalid password");
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      "secretkey"
    );

    res.json({
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        role: user.rows[0].role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});
// TEACHER ONLY
const isTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).send("Only teachers allowed");
  }
  next();
};

// MARK ATTENDANCE
app.post("/attendance", authenticate, isTeacher, async (req, res) => {
  try {
    const { student_id, date, period, status } = req.body;

    const result = await pool.query(
      "INSERT INTO attendance (student_id, teacher_id, date, period, status, school_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [student_id, req.user.id, date, period, status, 1]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error marking attendance");
  }
});

app.get("/admin-data", authenticate, isAdmin, (req, res) => {
  res.send("Only admin can see this");
});

// ✅ ALWAYS LAST
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});