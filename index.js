require("dotenv").config();

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const express = require("express");
const app = express();
const pool = require("./db");
const studentRoutes = require("./routes/studentRoutes");
const classRoutes = require("./routes/classRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const classSectionRoutes = require("./routes/classSectionRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const examRoutes = require("./routes/examRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const teacherSubjectAssignmentRoutes = require("./routes/teacherSubjectAssignmentRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const activityRoutes = require("./routes/activityRoutes");
const markRoutes = require("./routes/markRoutes");
const studentResultsRoutes = require("./routes/studentResultsRoutes");
const reportCardRoutes = require("./routes/reportCardRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const cashbookRoutes = require("./routes/cashbookRoutes");
const stockRoutes = require("./routes/stockRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const staffPostRoutes = require("./routes/staffPostRoutes");
const administrativeChargeRoutes = require("./routes/administrativeChargeRoutes");
const teacherAdministrativeChargeAssignmentRoutes = require("./routes/teacherAdministrativeChargeAssignmentRoutes");
const cors = require("cors");
const attendanceRoutes = require("./routes/attendanceRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
const studentImportRoutes = require(
  "./routes/studentImportRoutes"
);
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
  max: 10000,
  message: "Too many requests",
});

pool.query(`
  CREATE TABLE IF NOT EXISTS class_sections (
    id SERIAL PRIMARY KEY,
    class_name TEXT NOT NULL,
    section_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT class_sections_unique UNIQUE (class_name, section_name)
  )
`).catch((err) => {
  console.error("Failed to initialize class_sections table", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL UNIQUE,
    applicable_classes INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[]
  )
`).catch((err) => {
  console.error("Failed to initialize subjects table", err);
});

pool.query(`
  ALTER TABLE IF EXISTS subjects
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
`).catch((err) => {
  console.error("Failed to add created_at to subjects table", err);
});

pool.query(`
  ALTER TABLE IF EXISTS subjects
  ADD COLUMN IF NOT EXISTS applicable_classes INTEGER[] DEFAULT '{}'::INTEGER[] NOT NULL
`).catch((err) => {
  console.error("Failed to add applicable_classes to subjects table", err);
});

pool.query(`
  ALTER TABLE IF EXISTS subjects
  ALTER COLUMN subject_code SET NOT NULL
`).catch((err) => {
  console.error("Failed to ensure subject_code is not null", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS student_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    marks_obtained INTEGER NOT NULL CHECK (marks_obtained >= 0),
    max_marks INTEGER NOT NULL CHECK (max_marks > 0),
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    result_status TEXT NOT NULL DEFAULT 'Fail',
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch((err) => {
  console.error("Failed to initialize student_results table", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_section_id INTEGER NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT teacher_subject_assignments_unique UNIQUE (teacher_id, class_section_id, subject_id)
  )
`).catch((err) => {
  console.error("Failed to initialize teacher_subject_assignments table", err);
});

pool.query(`
  ALTER TABLE IF EXISTS teacher_subject_assignments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
`).catch((err) => {
  console.error("Failed to add created_at to teacher_subject_assignments table", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS timetables (
    id SERIAL PRIMARY KEY,
    class_section_id INTEGER NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day TEXT NOT NULL CHECK (day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    period_number INTEGER NOT NULL CHECK (period_number > 0),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT timetables_class_day_period_unique UNIQUE (class_section_id, day, period_number),
    CONSTRAINT timetables_teacher_day_period_unique UNIQUE (teacher_id, day, period_number),
    CONSTRAINT timetables_time_range_check CHECK (end_time > start_time)
  )
`).catch((err) => {
  console.error("Failed to initialize timetables table", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS staff_posts (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL DEFAULT 1,
    post_code TEXT NOT NULL,
    post_name TEXT NOT NULL,
    staff_category TEXT NOT NULL CHECK (staff_category IN ('Teaching', 'Administrative', 'Office', 'Support', 'Contractual')),
    appointment_nature TEXT NOT NULL CHECK (appointment_nature IN ('Permanent', 'Temporary', 'Contractual', 'Part-time', 'Outsourced', 'Deputation')),
    is_teaching_post BOOLEAN NOT NULL DEFAULT false,
    sanctioned_count INTEGER NOT NULL DEFAULT 0 CHECK (sanctioned_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT staff_posts_school_name_unique UNIQUE (school_id, post_name),
    CONSTRAINT staff_posts_school_code_unique UNIQUE (school_id, post_code)
  )
`).catch((err) => {
  console.error("Failed to initialize staff_posts table", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS administrative_charges (
    id SERIAL PRIMARY KEY,
    charge_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    school_id INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT administrative_charges_school_name_unique UNIQUE (school_id, charge_name)
  )
`).catch((err) => {
  console.error("Failed to initialize administrative_charges table", err);
});

app.use(limiter);
app.use(express.json());
app.use("/api/students", studentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/class-sections", classSectionRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teacher-subject-assignments", teacherSubjectAssignmentRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/marks", markRoutes);
app.use("/api/student-results", studentResultsRoutes);
app.use("/api/report-card", reportCardRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cashbook", cashbookRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/staff-posts", staffPostRoutes);
app.use("/api/administrative-charges", administrativeChargeRoutes);
app.use("/api/teacher-administrative-charge-assignments", teacherAdministrativeChargeAssignmentRoutes);
app.use("/", authRoutes);
app.use("/api/v1/auth", authRoutes);
app.use(
  "/api/student-import",
  studentImportRoutes
);
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
