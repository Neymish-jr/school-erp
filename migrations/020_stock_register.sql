-- Finance Unification Sprint 4: Stock Register (entries, issues, audit)

CREATE TABLE IF NOT EXISTS stock_entries (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    expense_request_id INTEGER NULL REFERENCES expense_requests(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity NUMERIC(15,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    purchase_rate NUMERIC(15,2) NOT NULL,
    total_value NUMERIC(15,2) NOT NULL,
    vendor_name VARCHAR(150) NULL,
    purchase_date DATE NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stock_entries_quantity CHECK (quantity > 0),
    CONSTRAINT chk_stock_entries_purchase_rate CHECK (purchase_rate > 0),
    CONSTRAINT chk_stock_entries_total_value CHECK (total_value > 0),
    CONSTRAINT chk_stock_entries_category CHECK (
        category IN (
            'sports',
            'library',
            'ict',
            'science_lab',
            'furniture',
            'teaching_learning_material',
            'office_supplies'
        )
    ),
    CONSTRAINT chk_stock_entries_source CHECK (source IN ('manual', 'expense_payment'))
);

CREATE TABLE IF NOT EXISTS stock_issues (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    stock_entry_id INTEGER NOT NULL REFERENCES stock_entries(id) ON DELETE RESTRICT,
    issued_quantity NUMERIC(15,2) NOT NULL,
    issue_type VARCHAR(20) NOT NULL,
    issued_to_teacher_id INTEGER NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    issued_to_activity_id INTEGER NULL REFERENCES activities(id) ON DELETE RESTRICT,
    issued_to_department VARCHAR(150) NULL,
    issue_date DATE NOT NULL,
    remarks TEXT NULL,
    created_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stock_issues_quantity CHECK (issued_quantity > 0),
    CONSTRAINT chk_stock_issues_type CHECK (
        issue_type IN ('teacher', 'activity', 'department')
    )
);

CREATE TABLE IF NOT EXISTS stock_audit_logs (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    entity_type VARCHAR(20) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(30) NOT NULL,
    actor_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stock_audit_entity_type CHECK (
        entity_type IN ('stock_entry', 'stock_issue')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_entries_expense_request_unique
    ON stock_entries (expense_request_id)
    WHERE expense_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_entries_school_item
    ON stock_entries (school_id, item_name);

CREATE INDEX IF NOT EXISTS idx_stock_entries_school_category
    ON stock_entries (school_id, category);

CREATE INDEX IF NOT EXISTS idx_stock_issues_entry
    ON stock_issues (stock_entry_id);

CREATE INDEX IF NOT EXISTS idx_stock_issues_school_date
    ON stock_issues (school_id, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_audit_school_entity
    ON stock_audit_logs (school_id, entity_type, entity_id, created_at DESC);
