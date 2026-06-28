-- School Charge Profile: speed up charge-scoped assignment lookups

CREATE INDEX IF NOT EXISTS idx_taca_charge_school
ON teacher_administrative_charge_assignments (administrative_charge_id, school_id, is_active);
