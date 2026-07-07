-- Ensure teacher profile columns used by create/update API exist

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS subject VARCHAR(255) NULL;

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS qualification VARCHAR(255) NULL;
