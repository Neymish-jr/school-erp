-- Administrative charges: add stable charge_code for RBAC charge-permission mapping
-- Prerequisite: administrative_charges table (bootstrap / legacy install)
-- Idempotent: safe to rerun (IF NOT EXISTS / conditional alters)
-- Runs before 025_seed_administrative_charge_permissions.sql (numeric migration order)

ALTER TABLE administrative_charges
    ADD COLUMN IF NOT EXISTS charge_code VARCHAR(50);

-- Official charge_name → charge_code map (demo fixtures + catalog §23)
UPDATE administrative_charges ac
SET charge_code = map.charge_code
FROM (
    VALUES
        ('PM SHRI Incharge', 'pm_shri_incharge'),
        ('Mid Day Meal Incharge', 'mdm_incharge'),
        ('Examination Incharge', 'board_exam_incharge'),
        ('Scholarship Incharge', 'scholarship_incharge'),
        ('Sports Incharge', 'sports_incharge'),
        ('Time Table Incharge', 'timetable_incharge'),
        ('Discipline Incharge', 'discipline_incharge'),
        ('Cultural Incharge', 'cultural_incharge'),
        ('ICT Incharge', 'ict_incharge'),
        ('UDISE Incharge', 'udise_incharge'),
        ('Principal Incharge', 'principal_incharge'),
        ('Library Incharge', 'library_incharge')
) AS map(charge_name, charge_code)
WHERE ac.charge_code IS NULL
  AND trim(ac.charge_name) ILIKE trim(map.charge_name);

-- Fallback: slugify custom charge names so NOT NULL can be applied safely
UPDATE administrative_charges
SET charge_code = lower(
    regexp_replace(
        regexp_replace(trim(charge_name), '[^a-zA-Z0-9]+', '_', 'g'),
        '(^_|_$)',
        '',
        'g'
    )
)
WHERE charge_code IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'administrative_charges'
          AND column_name = 'charge_code'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE administrative_charges
            ALTER COLUMN charge_code SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'administrative_charges_school_charge_code_unique'
    ) THEN
        ALTER TABLE administrative_charges
            ADD CONSTRAINT administrative_charges_school_charge_code_unique
            UNIQUE (school_id, charge_code);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_administrative_charges_charge_code
    ON administrative_charges (charge_code);
