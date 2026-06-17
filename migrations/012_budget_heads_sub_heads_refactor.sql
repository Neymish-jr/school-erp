-- Finance refactor: Budget Heads (parent) + Budget Sub Heads (child)
-- Migrates legacy flat budget_heads into two-table hierarchy.
-- Skips when legacy school_id column is absent.

DO $$
DECLARE
  creator_id INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_heads' AND column_name = 'school_id'
  ) THEN
    RAISE NOTICE 'Migration 012 skipped — legacy budget_heads schema not found.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'budget_sub_heads'
  ) THEN
    DROP TABLE budget_sub_heads;
  END IF;

  SELECT COALESCE(
    (SELECT id FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1),
    (SELECT id FROM users ORDER BY id LIMIT 1),
    1
  ) INTO creator_id;

  -- Step 1: Rename legacy
  ALTER TABLE budget_heads RENAME TO legacy_budget_heads;

  -- Step 2: Parent heads
  CREATE TABLE budget_heads (
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
  );

  CREATE INDEX IF NOT EXISTS idx_budget_heads_active ON budget_heads (is_active);

  -- Step 3: Seed parents from legacy categories
  INSERT INTO budget_heads (head_code, head_name, created_by_user_id)
  SELECT DISTINCT
    lb.category,
    CASE lb.category
      WHEN 'TEACHING_LEARNING' THEN 'Teaching Learning'
      WHEN 'ICT' THEN 'ICT & Digital Infrastructure'
      WHEN 'LIBRARY' THEN 'Library'
      WHEN 'SPORTS' THEN 'Sports & Physical Education'
      WHEN 'TRAINING' THEN 'Teacher Training & Capacity Building'
      WHEN 'OFFICE' THEN 'Office & Administration'
      WHEN 'MAINTENANCE' THEN 'Maintenance & Infrastructure'
      WHEN 'PM_SHRI' THEN 'Project Innovation'
      WHEN 'OTHER' THEN 'Other'
      ELSE INITCAP(REPLACE(lb.category, '_', ' '))
    END,
    creator_id
  FROM legacy_budget_heads lb
  ORDER BY lb.category;

  -- Step 4: Sub heads table
  CREATE TABLE budget_sub_heads (
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
  );

  CREATE INDEX IF NOT EXISTS idx_budget_sub_heads_head ON budget_sub_heads (budget_head_id, is_active);
  CREATE INDEX IF NOT EXISTS idx_budget_sub_heads_active ON budget_sub_heads (is_active);

  -- Step 5: Migrate legacy rows (deduplicated) into sub heads
  CREATE TEMP TABLE canonical_legacy AS
  SELECT DISTINCT ON (lb.category, lower(trim(lb.head_name)))
    lb.id AS legacy_id,
    lb.category,
    lb.head_code,
    lb.head_name,
    lb.remarks,
    lb.is_active,
    lb.created_by_user_id,
    lb.created_at,
    lb.updated_at
  FROM legacy_budget_heads lb
  ORDER BY lb.category, lower(trim(lb.head_name)), lb.id;

  INSERT INTO budget_sub_heads (
    budget_head_id,
    sub_head_code,
    sub_head_name,
    remarks,
    is_active,
    created_by_user_id,
    created_at,
    updated_at
  )
  SELECT
    bh.id,
    cl.head_code,
    cl.head_name,
    cl.remarks,
    cl.is_active,
    cl.created_by_user_id,
    cl.created_at,
    cl.updated_at
  FROM canonical_legacy cl
  INNER JOIN budget_heads bh ON bh.head_code = cl.category;

  -- Resolve sub_head_code collisions after cross-school merge
  UPDATE budget_sub_heads bsh
  SET sub_head_code = bsh.sub_head_code || '_M' || bsh.id
  WHERE bsh.id IN (
    SELECT b2.id
    FROM budget_sub_heads b1
    INNER JOIN budget_sub_heads b2
      ON lower(b1.sub_head_code) = lower(b2.sub_head_code)
      AND b1.id < b2.id
  );

  -- Legacy id → sub head id map
  CREATE TEMP TABLE legacy_subhead_map AS
  SELECT
    lb.id AS legacy_id,
    bsh.id AS sub_head_id
  FROM legacy_budget_heads lb
  INNER JOIN budget_heads bh ON bh.head_code = lb.category
  INNER JOIN budget_sub_heads bsh
    ON bsh.budget_head_id = bh.id
    AND lower(trim(bsh.sub_head_name)) = lower(trim(lb.head_name));

  -- Step 6–7: Remap allocations
  ALTER TABLE budget_allocations ADD COLUMN IF NOT EXISTS budget_sub_head_id INTEGER NULL;

  UPDATE budget_allocations ba
  SET budget_sub_head_id = map.sub_head_id
  FROM legacy_subhead_map map
  WHERE ba.budget_head_id = map.legacy_id;

  IF EXISTS (
    SELECT 1 FROM budget_allocations WHERE budget_sub_head_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration failed: allocations with unmapped budget_head_id remain';
  END IF;

  -- Step 8: Deactivate duplicate allocations after merge
  WITH ranked AS (
    SELECT
      ba.id,
      ROW_NUMBER() OVER (
        PARTITION BY ba.school_id, ba.financial_year_id, ba.budget_sub_head_id
        ORDER BY ba.is_active DESC, ba.allocated_amount DESC, ba.id ASC
      ) AS rn
    FROM budget_allocations ba
  )
  UPDATE budget_allocations ba
  SET is_active = FALSE, updated_at = NOW()
  FROM ranked r
  WHERE ba.id = r.id AND r.rn > 1;

  -- Step 9: Finalize allocations FK
  ALTER TABLE budget_allocations DROP CONSTRAINT IF EXISTS budget_allocations_budget_head_id_fkey;
  ALTER TABLE budget_allocations DROP CONSTRAINT IF EXISTS uq_budget_allocations_fy_head;
  ALTER TABLE budget_allocations DROP COLUMN budget_head_id;

  ALTER TABLE budget_allocations
    ALTER COLUMN budget_sub_head_id SET NOT NULL;

  ALTER TABLE budget_allocations
    ADD CONSTRAINT budget_allocations_budget_sub_head_id_fkey
    FOREIGN KEY (budget_sub_head_id) REFERENCES budget_sub_heads(id) ON DELETE RESTRICT;

  ALTER TABLE budget_allocations
    ADD CONSTRAINT uq_budget_allocations_fy_sub_head
    UNIQUE (school_id, financial_year_id, budget_sub_head_id);

  CREATE INDEX IF NOT EXISTS idx_budget_allocations_sub_head
    ON budget_allocations (budget_sub_head_id);

  -- Step 10: Drop legacy
  DROP TABLE legacy_budget_heads;

  DROP INDEX IF EXISTS idx_budget_heads_school_category;
  DROP INDEX IF EXISTS idx_budget_heads_school_active;

  RAISE NOTICE 'Migration 012 completed successfully.';
END $$;
