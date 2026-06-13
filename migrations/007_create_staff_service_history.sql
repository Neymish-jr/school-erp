-- Phase 1: Service History Foundation
-- Append-only employment and assignment event ledger.

CREATE TABLE IF NOT EXISTS staff_service_history (
    id SERIAL PRIMARY KEY,

    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,

    event_type VARCHAR(40) NOT NULL,
    event_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE NULL,

    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NULL,

    staff_post_id INTEGER NULL REFERENCES staff_posts(id) ON DELETE SET NULL,
    staff_post_assignment_id INTEGER NULL,

    administrative_charge_id INTEGER NULL REFERENCES administrative_charges(id) ON DELETE SET NULL,
    admin_charge_assignment_id INTEGER NULL,

    subject_id INTEGER NULL REFERENCES subjects(id) ON DELETE SET NULL,
    class_section_id INTEGER NULL REFERENCES class_sections(id) ON DELETE SET NULL,
    subject_assignment_id INTEGER NULL,

    from_school_id INTEGER NULL REFERENCES schools(id) ON DELETE SET NULL,
    to_school_id INTEGER NULL REFERENCES schools(id) ON DELETE SET NULL,
    deputation_organisation VARCHAR(255) NULL,

    order_number VARCHAR(100) NULL,
    order_date DATE NULL,
    remarks TEXT NULL,

    recorded_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'workflow',
    source_workflow VARCHAR(60) NULL,

    related_event_id INTEGER NULL REFERENCES staff_service_history(id) ON DELETE SET NULL,
    supersedes_event_id INTEGER NULL REFERENCES staff_service_history(id) ON DELETE SET NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_service_history_dates CHECK (
        end_date IS NULL OR end_date >= effective_date
    ),
    CONSTRAINT chk_service_history_event_type CHECK (
        event_type IN (
            'joining',
            'transfer_out',
            'transfer_in',
            'deputation_out',
            'deputation_in',
            'promotion',
            'designation_assigned',
            'designation_relieved',
            'admin_charge_assigned',
            'admin_charge_relieved',
            'subject_assigned',
            'subject_relieved',
            'retirement',
            'resignation',
            'reinstatement'
        )
    ),
    CONSTRAINT chk_service_history_source CHECK (
        source IN ('workflow', 'manual', 'migration', 'system')
    )
);

CREATE INDEX IF NOT EXISTS idx_staff_service_history_teacher_timeline
    ON staff_service_history (school_id, teacher_id, effective_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_staff_service_history_event_type
    ON staff_service_history (teacher_id, event_type, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_staff_service_history_migration_dedup
    ON staff_service_history (source, source_workflow, ((metadata->>'source_record_id')))
    WHERE source = 'migration';
