require("dotenv").config();

const fs = require("fs");
const path = require("path");
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
const teacherStaffPostAssignmentRoutes = require("./routes/teacherStaffPostAssignmentRoutes");
const staffServiceHistoryRoutes = require("./routes/staffServiceHistoryRoutes");
const financialYearRoutes = require("./routes/financialYearRoutes");
const budgetHeadRoutes = require("./routes/budgetHeadRoutes");
const budgetSubHeadRoutes = require("./routes/budgetSubHeadRoutes");
const budgetAllocationRoutes = require("./routes/budgetAllocationRoutes");
const expenseRequestRoutes = require("./routes/expenseRequestRoutes");
const financeCashbookRoutes = require("./routes/financeCashbookRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const cors = require("cors");
const attendanceRoutes = require("./routes/attendanceRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const staffPostController = require("./controllers/staffPostController");
const studentImportRoutes = require(
  "./routes/studentImportRoutes"
);
const {
  authenticate,
  isAdminLike,
  isSuperAdmin,
  isTeacher
} = require("./middleware/auth");

const errorHandler = require("./middleware/errorHandler");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./swagger");
const { runPendingMigrations } = require("./utils/migrationRunner");

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
    assignment_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assignment_end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_teacher_subject_assignment_dates CHECK (
      assignment_end_date IS NULL
      OR assignment_end_date >= assignment_start_date
    )
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
  ALTER TABLE IF EXISTS teacher_subject_assignments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS assignment_start_date DATE,
  ADD COLUMN IF NOT EXISTS assignment_end_date DATE NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
`).catch((err) => {
  console.error("Failed to add lifecycle columns to teacher_subject_assignments table", err);
});

pool.query(`
  UPDATE teacher_subject_assignments
  SET assignment_start_date = COALESCE(DATE(created_at), CURRENT_DATE)
  WHERE assignment_start_date IS NULL
`).catch((err) => {
  console.error("Failed to backfill assignment_start_date on teacher_subject_assignments", err);
});

pool.query(`
  ALTER TABLE IF EXISTS teacher_subject_assignments
  ALTER COLUMN assignment_start_date SET NOT NULL
`).catch((err) => {
  console.error("Failed to set assignment_start_date NOT NULL on teacher_subject_assignments", err);
});

pool.query(`
  ALTER TABLE IF EXISTS teacher_subject_assignments
  DROP CONSTRAINT IF EXISTS teacher_subject_assignments_unique
`).catch((err) => {
  console.error("Failed to drop legacy unique constraint on teacher_subject_assignments", err);
});

pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_teacher_subject_assignment
  ON teacher_subject_assignments (teacher_id, class_section_id, subject_id)
  WHERE is_active = TRUE
`).catch((err) => {
  console.error("Failed to create active assignment unique index on teacher_subject_assignments", err);
});

pool.query(`
  ALTER TABLE IF EXISTS teacher_subject_assignments
  DROP CONSTRAINT IF EXISTS chk_teacher_subject_assignment_dates
`).catch(() => {});

pool.query(`
  ALTER TABLE IF EXISTS teacher_subject_assignments
  ADD CONSTRAINT chk_teacher_subject_assignment_dates CHECK (
    assignment_end_date IS NULL
    OR assignment_end_date >= assignment_start_date
  )
`).catch((err) => {
  console.error("Failed to add date check constraint on teacher_subject_assignments", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS staff_service_history (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    event_type VARCHAR(40) NOT NULL,
    event_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE NULL,
    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NULL,
    staff_post_id INTEGER NULL REFERENCES staff_posts(id) ON DELETE SET NULL,
    staff_post_assignment_id INTEGER NULL,
    administrative_charge_id INTEGER NULL REFERENCES administrative_charges(id) ON DELETE SET NULL,
    admin_charge_assignment_id INTEGER NULL,
    subject_id INTEGER NULL REFERENCES subjects(id) ON DELETE SET NULL,
    class_section_id INTEGER NULL REFERENCES class_sections(id) ON DELETE SET NULL,
    subject_assignment_id INTEGER NULL,
    from_school_id INTEGER NULL REFERENCES schools(id) ON DELETE SET NULL,
    to_school_id INTEGER NULL REFERENCES schools(id) ON DELETE SET NULL,
    deputation_organisation VARCHAR(255) NULL,
    order_number VARCHAR(100) NULL,
    order_date DATE NULL,
    remarks TEXT NULL,
    recorded_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'workflow',
    source_workflow VARCHAR(60) NULL,
    related_event_id INTEGER NULL REFERENCES staff_service_history(id) ON DELETE SET NULL,
    supersedes_event_id INTEGER NULL REFERENCES staff_service_history(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_service_history_dates CHECK (
      end_date IS NULL OR end_date >= effective_date
    ),
    CONSTRAINT chk_service_history_event_type CHECK (
      event_type IN (
        'joining', 'transfer_out', 'transfer_in', 'deputation_out', 'deputation_in',
        'promotion', 'designation_assigned', 'designation_relieved',
        'admin_charge_assigned', 'admin_charge_relieved',
        'subject_assigned', 'subject_relieved',
        'retirement', 'resignation', 'reinstatement'
      )
    ),
    CONSTRAINT chk_service_history_source CHECK (
      source IN ('workflow', 'manual', 'migration', 'system')
    )
  )
`).catch((err) => {
  console.error("Failed to initialize staff_service_history table", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_staff_service_history_teacher_timeline
  ON staff_service_history (school_id, teacher_id, effective_date DESC, id DESC)
`).catch((err) => {
  console.error("Failed to create staff_service_history teacher timeline index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_staff_service_history_event_type
  ON staff_service_history (teacher_id, event_type, effective_date DESC)
`).catch((err) => {
  console.error("Failed to create staff_service_history event type index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_staff_service_history_migration_dedup
  ON staff_service_history (source, source_workflow, ((metadata->>'source_record_id')))
  WHERE source = 'migration'
`).catch((err) => {
  console.error("Failed to create staff_service_history migration dedup index", err);
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
    description TEXT DEFAULT \'\',
    is_active BOOLEAN NOT NULL DEFAULT true,
    school_id INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT administrative_charges_school_name_unique UNIQUE (school_id, charge_name)
  )
`).catch((err) => {
  console.error("Failed to initialize administrative_charges table", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS financial_years (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    year_label VARCHAR(9) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'closed',
    remarks TEXT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_financial_years_school_label UNIQUE (school_id, year_label),
    CONSTRAINT chk_financial_years_dates CHECK (end_date > start_date),
    CONSTRAINT chk_financial_years_status CHECK (status IN ('active', 'closed'))
  )
`).catch((err) => {
  console.error("Failed to initialize financial_years table", err);
});

pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_years_one_active
  ON financial_years (school_id)
  WHERE status = 'active'
`).catch((err) => {
  console.error("Failed to create uq_financial_years_one_active index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_financial_years_school_status
  ON financial_years (school_id, status)
`).catch((err) => {
  console.error("Failed to create idx_financial_years_school_status index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_financial_years_school_dates
  ON financial_years (school_id, start_date, end_date)
`).catch((err) => {
  console.error("Failed to create idx_financial_years_school_dates index", err);
});

const runBudgetMasterMigration = async () => {
  const check = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'budget_heads' AND column_name = 'school_id'
    ) AS needs_migration
  `);

  if (!check.rows[0]?.needs_migration) {
    return false;
  }

  const migrationPath = path.join(
    __dirname,
    "migrations",
    "012_budget_heads_sub_heads_refactor.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf8");
  console.log("Applying budget head/sub head migration 012...");
  await pool.query(sql);
  console.log("Budget head/sub head migration 012 applied.");
  return true;
};

runBudgetMasterMigration()
  .then(() =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS budget_heads (
        id SERIAL PRIMARY KEY,
        head_code VARCHAR(30) NOT NULL,
        head_name VARCHAR(150) NOT NULL,
        remarks TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_budget_heads_code UNIQUE (head_code),
        CONSTRAINT uq_budget_heads_name UNIQUE (head_name)
      )
    `)
  )
  .then(() =>
    pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_heads_active
      ON budget_heads (is_active)
    `)
  )
  .then(() =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS budget_sub_heads (
        id SERIAL PRIMARY KEY,
        budget_head_id INTEGER NOT NULL REFERENCES budget_heads(id) ON DELETE RESTRICT,
        sub_head_code VARCHAR(30) NOT NULL,
        sub_head_name VARCHAR(150) NOT NULL,
        remarks TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_budget_sub_heads_code UNIQUE (sub_head_code),
        CONSTRAINT uq_budget_sub_heads_head_name UNIQUE (budget_head_id, sub_head_name)
      )
    `)
  )
  .then(() =>
    pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_sub_heads_head
      ON budget_sub_heads (budget_head_id, is_active)
    `)
  )
  .then(() =>
    pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_sub_heads_active
      ON budget_sub_heads (is_active)
    `)
  )
  .then(() =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS budget_allocations (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
        financial_year_id INTEGER NOT NULL REFERENCES financial_years(id) ON DELETE RESTRICT,
        budget_sub_head_id INTEGER NOT NULL REFERENCES budget_sub_heads(id) ON DELETE RESTRICT,
        allocated_amount NUMERIC(15,2) NOT NULL,
        responsible_teacher_id INTEGER NULL REFERENCES teachers(id) ON DELETE RESTRICT,
        remarks TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_budget_allocations_fy_sub_head UNIQUE (school_id, financial_year_id, budget_sub_head_id),
        CONSTRAINT chk_budget_allocations_amount CHECK (allocated_amount > 0)
      )
    `)
  )
  .then(() =>
    pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_allocations_fy
      ON budget_allocations (financial_year_id, is_active)
    `)
  )
  .then(() =>
    pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_allocations_teacher
      ON budget_allocations (responsible_teacher_id)
    `)
  )
  .then(() =>
    pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_allocations_school
      ON budget_allocations (school_id, financial_year_id)
    `)
  )
  .then(() =>
    pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_allocations_sub_head
      ON budget_allocations (budget_sub_head_id)
    `)
  )
  .catch((err) => {
    console.error("Failed to initialize finance master/allocation tables", err);
  });

pool.query(`
  CREATE TABLE IF NOT EXISTS expense_requests (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    budget_allocation_id INTEGER NOT NULL REFERENCES budget_allocations(id) ON DELETE RESTRICT,
    requested_amount NUMERIC(15,2) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(150) NULL,
    remarks TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NULL,
    reviewed_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ NULL,
    rejection_remarks TEXT NULL,
    paid_at TIMESTAMPTZ NULL,
    payment_voucher_no VARCHAR(50) NULL,
    payment_transaction_id VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expense_requests_status CHECK (
      status IN ('draft', 'pending', 'approved', 'rejected', 'paid')
    ),
    CONSTRAINT chk_expense_requests_amount CHECK (requested_amount > 0)
  )
`).catch((err) => {
  console.error("Failed to initialize expense_requests table", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_expense_requests_allocation
  ON expense_requests (budget_allocation_id, status)
`).catch((err) => {
  console.error("Failed to create idx_expense_requests_allocation index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_expense_requests_school_status
  ON expense_requests (school_id, status)
`).catch((err) => {
  console.error("Failed to create idx_expense_requests_school_status index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_expense_requests_submitter
  ON expense_requests (submitted_by_user_id)
`).catch((err) => {
  console.error("Failed to create idx_expense_requests_submitter index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_expense_requests_creator
  ON expense_requests (created_by_user_id)
`).catch((err) => {
  console.error("Failed to create idx_expense_requests_creator index", err);
});

runPendingMigrations(pool).catch((err) => {
  console.error("Failed to apply pending migrations", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS cashbook_entries (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    financial_year_id INTEGER NOT NULL REFERENCES financial_years(id) ON DELETE RESTRICT,
    entry_type VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    entry_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(150) NULL,
    voucher_no VARCHAR(50) NULL,
    transaction_id VARCHAR(100) NULL,
    budget_allocation_id INTEGER NOT NULL REFERENCES budget_allocations(id) ON DELETE RESTRICT,
    budget_head_id INTEGER NOT NULL REFERENCES budget_heads(id) ON DELETE RESTRICT,
    budget_sub_head_id INTEGER NOT NULL REFERENCES budget_sub_heads(id) ON DELETE RESTRICT,
    expense_request_id INTEGER NULL REFERENCES expense_requests(id) ON DELETE RESTRICT,
    posted_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cashbook_entries_type CHECK (
      entry_type IN ('payment', 'receipt', 'deposit', 'journal')
    ),
    CONSTRAINT chk_cashbook_entries_direction CHECK (
      direction IN ('inflow', 'outflow')
    ),
    CONSTRAINT chk_cashbook_entries_amount CHECK (amount > 0)
  )
`).catch((err) => {
  console.error("Failed to initialize cashbook_entries table", err);
});

pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_cashbook_entries_expense_request_unique
  ON cashbook_entries (expense_request_id)
  WHERE expense_request_id IS NOT NULL
`).catch((err) => {
  console.error("Failed to create idx_cashbook_entries_expense_request_unique index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_cashbook_entries_school_date
  ON cashbook_entries (school_id, entry_date DESC)
`).catch((err) => {
  console.error("Failed to create idx_cashbook_entries_school_date index", err);
});

pool.query(`
  CREATE INDEX IF NOT EXISTS idx_cashbook_entries_school_fy
  ON cashbook_entries (school_id, financial_year_id, entry_date DESC)
`).catch((err) => {
  console.error("Failed to create idx_cashbook_entries_school_fy index", err);
});

pool.query(`
  CREATE TABLE IF NOT EXISTS teacher_staff_post_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    staff_post_id INTEGER NOT NULL REFERENCES staff_posts(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_teacher_post_assignment UNIQUE (teacher_id, staff_post_id, assigned_date)
  );
`).catch((err) => {
  console.error("Failed to initialize teacher_staff_post_assignments table", err);
});

pool.query(`
  ALTER TABLE IF EXISTS teachers
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50) NULL
`).catch((err) => {
  console.error("Failed to add employee_code to teachers table", err);
});

pool.query(`
  ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS teacher_id INTEGER NULL REFERENCES teachers(id) ON DELETE SET NULL
`).catch((err) => {
  console.error("Failed to add teacher_id to users table", err);
});

app.use(limiter);
app.use(express.json());
app.use("/api/students", studentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/class-sections", classSectionRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/users", userRoutes);
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
app.use("/api/teacher-staff-post-assignments", teacherStaffPostAssignmentRoutes);
app.use("/api/staff-service-history", staffServiceHistoryRoutes);
app.use("/api/financial-years", financialYearRoutes);
app.use("/api/budget-heads", budgetHeadRoutes);
app.use("/api/budget-sub-heads", budgetSubHeadRoutes);
app.use("/api/budget-allocations", budgetAllocationRoutes);
app.use("/api/expense-requests", expenseRequestRoutes);
app.use("/api/finance/cashbook", financeCashbookRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/", authRoutes);


// Staff Post Dashboard Widgets

app.get(
  "/api/dashboard/staff-posts/total",
  authenticate,
  isAdminLike,
  staffPostController.getTotalStaffPosts
);

app.get(
  "/api/dashboard/staff-posts/sanctioned-strength",
  authenticate,
  isAdminLike,
  staffPostController.getTotalSanctionedStrength
);

app.get(
  "/api/dashboard/staff-posts/filled-positions",
  authenticate,
  isAdminLike,
  staffPostController.getFilledPositions
);

app.get(
  "/api/dashboard/staff-posts/vacant-positions",
  authenticate,
  isAdminLike,
  staffPostController.getVacantPositions
);

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

app.get("/test-db", authenticate, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.get("/admin-data", authenticate, isAdminLike, (req, res) => {
  res.send("Only admin can see this");
});

app.use(errorHandler);

// ✅ ALWAYS LAST
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
