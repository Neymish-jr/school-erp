-- Finance Foundation Phase 3: Budget Allocations

CREATE TABLE IF NOT EXISTS budget_allocations (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    financial_year_id INTEGER NOT NULL REFERENCES financial_years(id) ON DELETE RESTRICT,
    budget_head_id INTEGER NOT NULL REFERENCES budget_heads(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(15,2) NOT NULL,
    responsible_teacher_id INTEGER NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    remarks TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_budget_allocations_fy_head UNIQUE (school_id, financial_year_id, budget_head_id),
    CONSTRAINT chk_budget_allocations_amount CHECK (allocated_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_fy
ON budget_allocations (financial_year_id, is_active);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_teacher
ON budget_allocations (responsible_teacher_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_school
ON budget_allocations (school_id, financial_year_id);
