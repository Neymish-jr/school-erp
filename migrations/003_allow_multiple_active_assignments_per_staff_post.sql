-- Allow multiple active teacher assignments per staff post up to sanctioned_count.
-- Preserves unique_active_post_per_teacher_per_school (one active designation per teacher).

DROP INDEX IF EXISTS unique_active_teacher_per_post_per_school;
