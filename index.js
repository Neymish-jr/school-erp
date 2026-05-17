require("dotenv").config();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const express = require("express");
const app = express();
const pool = require("./db");
const studentRoutes = require("./routes/studentRoutes");
const classRoutes = require("./routes/classRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const examRoutes = require("./routes/examRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const activityRoutes = require("./routes/activityRoutes");
const markRoutes = require("./routes/markRoutes");
const reportCardRoutes = require("./routes/reportCardRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const cashbookRoutes = require("./routes/cashbookRoutes");
const stockRoutes = require("./routes/stockRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const cors = require("cors");
const attendanceRoutes = require("./routes/attendanceRoutes");
const { validateRegister } = require("./middleware/validation");
const {
  authenticate,
  isAdmin,
  isTeacher
} = require("./middleware/auth");


app.use(cors());
app.use(express.json());
app.use("/api/students", studentRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/marks", markRoutes);
app.use("/api/report-card", reportCardRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cashbook", cashbookRoutes);
app.use("/api/stock", stockRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/api/quotations", quotationRoutes);

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
app.post("/register", validateRegister, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
const existingUser = await pool.query(
  "SELECT * FROM users WHERE email = $1",
  [email]
);

if (existingUser.rows.length > 0) {
  return res.status(400).send("Email already exists");
}
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
      { 
        id: user.rows[0].id,
        role: user.rows[0].role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
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

app.get("/admin-data", authenticate, isAdmin, (req, res) => {
  res.send("Only admin can see this");
});
app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({
    error: "Something went wrong"
  });

});
// ✅ ALWAYS LAST
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});