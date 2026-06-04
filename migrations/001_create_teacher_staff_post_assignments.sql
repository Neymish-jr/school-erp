-- Migration for creating the teacher_staff_post_assignments table

CREATE TABLE teacher_staff_post_assignments (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    staff_post_id INTEGER NOT NULL REFERENCES staff_posts(id) ON DELETE RESTRICT,
    assignment_start_date DATE NOT NULL,
    assignment_end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_assignment_dates CHECK (
        assignment_end_date IS NULL
        OR assignment_end_date >= assignment_start_date
    )
);

-- Add unique constraint for one active post per teacher per school
-- Ensures a teacher can only hold one active staff post within a school
CREATE UNIQUE INDEX unique_active_post_per_teacher_per_school 
ON teacher_staff_post_assignments (school_id, teacher_id) 
WHERE is_active = TRUE;

-- Add unique constraint for one active teacher per post per school
-- Ensures a staff post can only have one active teacher assigned within a school
CREATE UNIQUE INDEX unique_active_teacher_per_post_per_school 
ON teacher_staff_post_assignments (school_id, staff_post_id) 
WHERE is_active = TRUE;

-- Index for efficient lookup of all assignments for a specific teacher
CREATE INDEX idx_teacher_staff_post_assignments_teacher_id 
ON teacher_staff_post_assignments (school_id, teacher_id);

-- Index for efficient lookup of all assignments for a specific staff post
CREATE INDEX idx_teacher_staff_post_assignments_staff_post_id
ON teacher_staff_post_assignments (school_id, staff_post_id);