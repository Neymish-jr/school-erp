-- RBAC v1: permissions catalog, role grants, charge additive grants, user overrides
-- Aligns with docs/RBAC_DATABASE_DESIGN.md (revision 2)
-- Roles are code-defined; no roles table. No seed data in this migration.

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    permission_key VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    data_scope VARCHAR(20) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permissions_key UNIQUE (permission_key)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_code VARCHAR(30) NOT NULL,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_code, permission_id),
    CONSTRAINT chk_role_permissions_role_code CHECK (
        role_code IN (
            'super_admin',
            'dpo',
            'beo',
            'principal',
            'office_staff',
            'teacher'
        )
    )
);

CREATE TABLE IF NOT EXISTS administrative_charge_permissions (
    administrative_charge_id INTEGER NOT NULL REFERENCES administrative_charges(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (administrative_charge_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    effect VARCHAR(10) NOT NULL,
    school_id INTEGER NULL REFERENCES schools(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NULL,
    reason TEXT NULL,
    granted_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ NULL,
    revoked_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_permission_overrides_effect CHECK (effect IN ('grant', 'deny'))
);

CREATE INDEX IF NOT EXISTS idx_permissions_category
    ON permissions (category, is_active);

CREATE INDEX IF NOT EXISTS idx_permissions_data_scope
    ON permissions (data_scope);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
    ON role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_acp_permission
    ON administrative_charge_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_upo_user_active
    ON user_permission_overrides (user_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_upo_expires
    ON user_permission_overrides (expires_at)
    WHERE revoked_at IS NULL AND expires_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_upo_active
    ON user_permission_overrides (user_id, permission_id, COALESCE(school_id, 0))
    WHERE revoked_at IS NULL;

-- =============================================================================
-- ROLLBACK (manual — run in reverse order if reverting this migration)
-- =============================================================================
-- DROP INDEX IF EXISTS uq_upo_active;
-- DROP INDEX IF EXISTS idx_upo_expires;
-- DROP INDEX IF EXISTS idx_upo_user_active;
-- DROP INDEX IF EXISTS idx_acp_permission;
-- DROP INDEX IF EXISTS idx_role_permissions_permission;
-- DROP INDEX IF EXISTS idx_permissions_data_scope;
-- DROP INDEX IF EXISTS idx_permissions_category;
-- DROP TABLE IF EXISTS user_permission_overrides;
-- DROP TABLE IF EXISTS administrative_charge_permissions;
-- DROP TABLE IF EXISTS role_permissions;
-- DROP TABLE IF EXISTS permissions;
