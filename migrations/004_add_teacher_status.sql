-- Phase 1: Teacher employment status foundation
-- Allowed values: active, inactive, transferred, retired, resigned

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE teachers
  DROP CONSTRAINT IF EXISTS teachers_status_check;

ALTER TABLE teachers
  ADD CONSTRAINT teachers_status_check
    CHECK (status IN ('active', 'inactive', 'transferred', 'retired', 'resigned'));

CREATE INDEX IF NOT EXISTS idx_teachers_school_status
  ON teachers (school_id, status);

UPDATE teachers
SET status = 'active'
WHERE status IS NULL;
