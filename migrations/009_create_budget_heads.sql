-- Finance Foundation Phase 2: Budget Heads

CREATE TABLE IF NOT EXISTS budget_heads (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    head_code VARCHAR(20) NOT NULL,
    head_name VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL,
    description TEXT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_budget_heads_school_code UNIQUE (school_id, head_code),
    CONSTRAINT uq_budget_heads_school_name UNIQUE (school_id, head_name),
    CONSTRAINT chk_budget_heads_category CHECK (
        category IN (
            'TEACHING_LEARNING',
            'ICT',
            'LIBRARY',
            'SPORTS',
            'TRAINING',
            'OFFICE',
            'MAINTENANCE',
            'PM_SHRI',
            'OTHER'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_budget_heads_school_category
ON budget_heads (school_id, category, is_active);

CREATE INDEX IF NOT EXISTS idx_budget_heads_school_active
ON budget_heads (school_id, is_active);
