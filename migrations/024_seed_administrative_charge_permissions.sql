-- RBAC: Seed administrative_charge_permissions from docs/PERMISSION_CATALOG.md (§23)
-- Prerequisite: 021_rbac_schema.sql, 022_seed_permissions.sql, 025_add_charge_code.sql
-- Joins administrative_charges.charge_code directly (no charge_name normalization)
-- Idempotent: INSERT ... SELECT ... WHERE NOT EXISTS on (administrative_charge_id, permission_id)
-- No-op when charge_code column is absent (fresh installs seed via 025_add_charge_code.sql)

INSERT INTO administrative_charge_permissions (administrative_charge_id, permission_id)
SELECT ac.id, p.id
FROM (
    VALUES
    ('pm_shri_incharge', 'pm_shri.dashboard.read'),
    ('pm_shri_incharge', 'pm_shri.report.submit'),
    ('pm_shri_incharge', 'pm_shri.activity.read'),
    ('pm_shri_incharge', 'pm_shri.expense_request.create'),
    ('mdm_incharge', 'mdm.report.submit'),
    ('mdm_incharge', 'mdm.dashboard.read'),
    ('board_exam_incharge', 'board_exam.result.create'),
    ('board_exam_incharge', 'board_exam.result.read'),
    ('board_exam_incharge', 'board_exam.student.read'),
    ('scholarship_incharge', 'scholarship.student.read'),
    ('scholarship_incharge', 'scholarship.application.update'),
    ('scholarship_incharge', 'scholarship.report.export'),
    ('sports_incharge', 'sports.activity.create'),
    ('sports_incharge', 'sports.activity.approve'),
    ('sports_incharge', 'sports.stock.issue'),
    ('timetable_incharge', 'timetable.create'),
    ('timetable_incharge', 'timetable.delete'),
    ('discipline_incharge', 'discipline.incident.create'),
    ('discipline_incharge', 'discipline.incident.read'),
    ('discipline_incharge', 'discipline.incident.update'),
    ('cultural_incharge', 'cultural.activity.create'),
    ('cultural_incharge', 'cultural.activity.read'),
    ('cultural_incharge', 'cultural.expense_request.create'),
    ('ict_incharge', 'ict.stock.read'),
    ('ict_incharge', 'ict.stock.issue'),
    ('ict_incharge', 'ict.activity.create'),
    ('udise_incharge', 'udise.data.read'),
    ('udise_incharge', 'udise.data.export'),
    ('udise_incharge', 'udise.student.read'),
    ('principal_incharge', 'finance.activity.approve'),
    ('principal_incharge', 'finance.expense_request.approve'),
    ('principal_incharge', 'finance.expense_request.mark_paid'),
    ('principal_incharge', 'administration.charge_assignment.assign')
) AS template(charge_code, permission_key)
INNER JOIN administrative_charges ac ON ac.charge_code = template.charge_code
INNER JOIN permissions p ON p.permission_key = template.permission_key
WHERE EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'administrative_charges'
      AND column_name = 'charge_code'
)
AND NOT EXISTS (
    SELECT 1
    FROM administrative_charge_permissions acp
    WHERE acp.administrative_charge_id = ac.id
      AND acp.permission_id = p.id
);
