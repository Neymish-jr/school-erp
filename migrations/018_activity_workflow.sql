-- Finance Unification Sprint 2: Activity workflow + audit columns

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS file_path TEXT NULL;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER NULL
        REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS submitted_by_user_id INTEGER NULL
        REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS reviewed_by_user_id INTEGER NULL
        REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS rejection_remarks TEXT NULL;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS completed_by_user_id INTEGER NULL
        REFERENCES users(id) ON DELETE RESTRICT;

-- Migrate legacy status values before replacing the check constraint
UPDATE activities SET status = 'submitted' WHERE status = 'Pending';
UPDATE activities SET status = 'approved' WHERE status = 'Approved';
UPDATE activities SET status = 'rejected' WHERE status = 'Rejected';
UPDATE activities SET status = 'completed' WHERE status = 'Completed';

ALTER TABLE activities ALTER COLUMN status SET DEFAULT 'draft';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_activities_status'
    ) THEN
        ALTER TABLE activities DROP CONSTRAINT chk_activities_status;
    END IF;
END $$;

ALTER TABLE activities
    ADD CONSTRAINT chk_activities_status CHECK (
        status IN ('draft', 'submitted', 'approved', 'rejected', 'completed')
    );

CREATE INDEX IF NOT EXISTS idx_activities_status
    ON activities (school_id, status);

CREATE INDEX IF NOT EXISTS idx_activities_created_by
    ON activities (created_by_user_id);
