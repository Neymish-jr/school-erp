-- Finance V1: Expense Requests

CREATE TABLE IF NOT EXISTS expense_requests (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    budget_allocation_id INTEGER NOT NULL REFERENCES budget_allocations(id) ON DELETE RESTRICT,
    requested_amount NUMERIC(15,2) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(150) NULL,
    remarks TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NULL,
    reviewed_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ NULL,
    rejection_remarks TEXT NULL,
    paid_at TIMESTAMPTZ NULL,
    payment_voucher_no VARCHAR(50) NULL,
    payment_transaction_id VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expense_requests_status CHECK (
        status IN ('draft', 'pending', 'approved', 'rejected', 'paid')
    ),
    CONSTRAINT chk_expense_requests_amount CHECK (requested_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_expense_requests_allocation
ON expense_requests (budget_allocation_id, status);

CREATE INDEX IF NOT EXISTS idx_expense_requests_school_status
ON expense_requests (school_id, status);

CREATE INDEX IF NOT EXISTS idx_expense_requests_submitter
ON expense_requests (submitted_by_user_id);

CREATE INDEX IF NOT EXISTS idx_expense_requests_creator
ON expense_requests (created_by_user_id);
