-- Phase 0: Teacher Identity Hardening
-- Adds users.teacher_id FK and teachers.employee_code

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50) NULL;

ALTER TABLE teachers
  DROP CONSTRAINT IF EXISTS teachers_employee_code_format_check;

ALTER TABLE teachers
  ADD CONSTRAINT teachers_employee_code_format_check
    CHECK (
      employee_code IS NULL
      OR (
        length(trim(employee_code)) > 0
        AND employee_code = trim(employee_code)
      )
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_school_employee_code
  ON teachers (school_id, employee_code)
  WHERE employee_code IS NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS teacher_id INTEGER NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_teacher_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_teacher_id_fkey
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(id)
        ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_teacher_id_unique
  ON users (teacher_id)
  WHERE teacher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_school_teacher
  ON users (school_id, teacher_id)
  WHERE teacher_id IS NOT NULL;
