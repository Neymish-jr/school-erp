require("dotenv").config();

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const express = require("express");
const app = express();
const pool = require("./db");
const studentRoutes = require("./routes/studentRoutes");
const classRoutes = require("./routes/classRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
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
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
const {
  authenticate,
  isAdmin,
  isTeacher
} = require("./middleware/auth");

const errorHandler = require("./middleware/errorHandler");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./swagger");

app.use(cors());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);
app.use(express.json());
app.use("/api/students", studentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/teachers", teacherRoutes);
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
app.use("/api/attendance", attendanceRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/", authRoutes);
app.use("/api/v1/auth", authRoutes);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs)
);

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

app.get("/admin-data", authenticate, isAdmin, (req, res) => {
  res.send("Only admin can see this");
});

app.use(errorHandler);

// ✅ ALWAYS LAST
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});