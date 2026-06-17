-- Refactor budget_heads: drop display_order, rename description to remarks

ALTER TABLE IF EXISTS budget_heads
  DROP COLUMN IF EXISTS display_order;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'budget_heads'
      AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'budget_heads'
      AND column_name = 'remarks'
  ) THEN
    ALTER TABLE budget_heads RENAME COLUMN description TO remarks;
  END IF;
END $$;

ALTER TABLE IF EXISTS budget_heads
  ADD COLUMN IF NOT EXISTS remarks TEXT NULL;
