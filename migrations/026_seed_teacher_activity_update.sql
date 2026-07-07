-- RC: Allow teachers to edit draft/rejected activities (finance.activity.update)

INSERT INTO role_permissions (role_code, permission_id)
SELECT seed.role_code, p.id
FROM (VALUES
    ('teacher', 'finance.activity.update')
) AS seed(role_code, permission_key)
INNER JOIN permissions p ON p.permission_key = seed.permission_key
WHERE NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_code = seed.role_code
      AND rp.permission_id = p.id
);
