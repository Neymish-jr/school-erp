-- Finance Foundation Phase 1: Financial Years

CREATE TABLE IF NOT EXISTS financial_years (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    year_label VARCHAR(9) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'closed',
    remarks TEXT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_financial_years_school_label UNIQUE (school_id, year_label),
    CONSTRAINT chk_financial_years_dates CHECK (end_date > start_date),
    CONSTRAINT chk_financial_years_status CHECK (status IN ('active', 'closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_years_one_active
ON financial_years (school_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_financial_years_school_status
ON financial_years (school_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_years_school_dates
ON financial_years (school_id, start_date, end_date);
