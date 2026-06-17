-- Finance Phase 5: Cashbook V2 ledger

CREATE TABLE IF NOT EXISTS cashbook_entries (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    financial_year_id INTEGER NOT NULL REFERENCES financial_years(id) ON DELETE RESTRICT,
    entry_type VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    entry_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(150) NULL,
    voucher_no VARCHAR(50) NULL,
    transaction_id VARCHAR(100) NULL,
    budget_allocation_id INTEGER NOT NULL REFERENCES budget_allocations(id) ON DELETE RESTRICT,
    budget_head_id INTEGER NOT NULL REFERENCES budget_heads(id) ON DELETE RESTRICT,
    budget_sub_head_id INTEGER NOT NULL REFERENCES budget_sub_heads(id) ON DELETE RESTRICT,
    expense_request_id INTEGER NULL REFERENCES expense_requests(id) ON DELETE RESTRICT,
    posted_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cashbook_entries_type CHECK (
        entry_type IN ('payment', 'receipt', 'deposit', 'journal')
    ),
    CONSTRAINT chk_cashbook_entries_direction CHECK (
        direction IN ('inflow', 'outflow')
    ),
    CONSTRAINT chk_cashbook_entries_amount CHECK (amount > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashbook_entries_expense_request_unique
ON cashbook_entries (expense_request_id)
WHERE expense_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cashbook_entries_school_date
ON cashbook_entries (school_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_cashbook_entries_school_fy
ON cashbook_entries (school_id, financial_year_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_cashbook_entries_head_fy
ON cashbook_entries (budget_head_id, financial_year_id);

CREATE INDEX IF NOT EXISTS idx_cashbook_entries_sub_head_fy
ON cashbook_entries (budget_sub_head_id, financial_year_id);

-- Backfill paid expense requests into the ledger (idempotent)
INSERT INTO cashbook_entries (
    school_id,
    financial_year_id,
    entry_type,
    direction,
    entry_date,
    amount,
    description,
    vendor_name,
    voucher_no,
    transaction_id,
    budget_allocation_id,
    budget_head_id,
    budget_sub_head_id,
    expense_request_id,
    posted_by_user_id,
    metadata,
    created_at,
    updated_at
)
SELECT
    er.school_id,
    ba.financial_year_id,
    'payment',
    'outflow',
    COALESCE(er.paid_at::date, er.updated_at::date),
    er.requested_amount,
    er.purpose,
    er.vendor_name,
    er.payment_voucher_no,
    er.payment_transaction_id,
    er.budget_allocation_id,
    bsh.budget_head_id,
    ba.budget_sub_head_id,
    er.id,
    er.reviewed_by_user_id,
    '{}'::jsonb,
    COALESCE(er.paid_at, er.updated_at, NOW()),
    NOW()
FROM expense_requests er
INNER JOIN budget_allocations ba ON ba.id = er.budget_allocation_id
INNER JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
WHERE er.status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM cashbook_entries ce
    WHERE ce.expense_request_id = er.id
  );
