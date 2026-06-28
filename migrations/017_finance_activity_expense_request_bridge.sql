-- Finance Unification Sprint 1 (P1-2):
-- Bridge activities ↔ expense_requests

-- Ensure activities table exists (legacy table was not previously migrated)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    activity_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    allocated_budget NUMERIC(15,2) NOT NULL,
    assigned_teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    file_path TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_activities_allocated_budget CHECK (allocated_budget > 0),
    CONSTRAINT chk_activities_status CHECK (
        status IN ('Pending', 'Approved', 'Rejected', 'Completed')
    )
);

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS budget_allocation_id INTEGER NULL
        REFERENCES budget_allocations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_activities_school
    ON activities (school_id);

CREATE INDEX IF NOT EXISTS idx_activities_budget_allocation
    ON activities (budget_allocation_id)
    WHERE budget_allocation_id IS NOT NULL;

-- Expense request bridge columns (nullable for backward compatibility)
ALTER TABLE expense_requests
    ADD COLUMN IF NOT EXISTS activity_id INTEGER NULL
        REFERENCES activities(id) ON DELETE RESTRICT;

ALTER TABLE expense_requests
    ADD COLUMN IF NOT EXISTS item_name VARCHAR(255) NULL;

ALTER TABLE expense_requests
    ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_expense_requests_quantity_positive'
    ) THEN
        ALTER TABLE expense_requests
            ADD CONSTRAINT chk_expense_requests_quantity_positive
            CHECK (quantity IS NULL OR quantity > 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expense_requests_activity
    ON expense_requests (activity_id)
    WHERE activity_id IS NOT NULL;
