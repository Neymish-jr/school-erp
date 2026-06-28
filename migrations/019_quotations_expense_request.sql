-- Finance Unification Sprint 3: Quotations linked to expense requests

CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NULL,
    expense_request_id INTEGER NULL REFERENCES expense_requests(id) ON DELETE RESTRICT,
    expense_id INTEGER NULL,
    vendor_name VARCHAR(150) NOT NULL,
    vendor_contact VARCHAR(100) NULL,
    quotation_amount NUMERIC(15,2) NOT NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT NULL,
    attachment_path TEXT NULL,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    selected_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    selected_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_quotations_amount CHECK (quotation_amount > 0)
);

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS school_id INTEGER NULL REFERENCES schools(id) ON DELETE RESTRICT;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS expense_request_id INTEGER NULL
        REFERENCES expense_requests(id) ON DELETE RESTRICT;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS expense_id INTEGER NULL;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS vendor_contact VARCHAR(100) NULL;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS quotation_date DATE NULL;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS remarks TEXT NULL;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS attachment_path TEXT NULL;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER NULL
        REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS selected_by_user_id INTEGER NULL
        REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ NULL;

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS is_selected BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill school_id from expense requests where possible
UPDATE quotations q
SET school_id = er.school_id
FROM expense_requests er
WHERE q.expense_request_id = er.id
  AND q.school_id IS NULL;

ALTER TABLE expense_requests
    ADD COLUMN IF NOT EXISTS selected_quotation_id INTEGER NULL
        REFERENCES quotations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_quotations_expense_request
    ON quotations (expense_request_id, quotation_amount ASC);

CREATE INDEX IF NOT EXISTS idx_quotations_school
    ON quotations (school_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_selected_per_request
    ON quotations (expense_request_id)
    WHERE is_selected = TRUE AND expense_request_id IS NOT NULL;
