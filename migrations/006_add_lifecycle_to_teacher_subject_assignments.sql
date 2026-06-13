-- Migration: Add lifecycle fields to teacher_subject_assignments
-- Converts delete-based management to relieve-based lifecycle management.

-- 1. Add lifecycle columns
ALTER TABLE teacher_subject_assignments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS assignment_start_date DATE,
  ADD COLUMN IF NOT EXISTS assignment_end_date DATE NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Backfill existing rows
UPDATE teacher_subject_assignments
SET assignment_start_date = COALESCE(DATE(created_at), CURRENT_DATE)
WHERE assignment_start_date IS NULL;

ALTER TABLE teacher_subject_assignments
  ALTER COLUMN assignment_start_date SET NOT NULL;

-- 3. Replace global unique constraint with partial unique index (active rows only)
ALTER TABLE teacher_subject_assignments
  DROP CONSTRAINT IF EXISTS teacher_subject_assignments_unique;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_teacher_subject_assignment
  ON teacher_subject_assignments (teacher_id, class_section_id, subject_id)
  WHERE is_active = TRUE;

-- 4. Date integrity check
ALTER TABLE teacher_subject_assignments
  DROP CONSTRAINT IF EXISTS chk_teacher_subject_assignment_dates;

ALTER TABLE teacher_subject_assignments
  ADD CONSTRAINT chk_teacher_subject_assignment_dates CHECK (
    assignment_end_date IS NULL
    OR assignment_end_date >= assignment_start_date
  );

-- 5. Index for history / service-record lookups
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher_active
  ON teacher_subject_assignments (teacher_id, is_active, assignment_start_date DESC);
