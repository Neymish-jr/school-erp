-- Align teacher status with government-school staffing lifecycle
-- Remove: inactive
-- Add: deputation

UPDATE teachers
SET status = 'active'
WHERE status = 'inactive';

ALTER TABLE teachers
  DROP CONSTRAINT IF EXISTS teachers_status_check;

ALTER TABLE teachers
  ADD CONSTRAINT teachers_status_check
    CHECK (status IN ('active', 'transferred', 'retired', 'resigned', 'deputation'));
