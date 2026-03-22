-- ============================================================
-- Migration 002 — Fix recursive RLS policy + activity action
-- Run this in the Supabase SQL editor.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Fix infinite recursion in project_members RLS policy
--
-- The original policy referenced project_members inside itself:
--   USING (user_id = auth.uid() OR project_id IN (
--     SELECT project_id FROM project_members WHERE user_id = auth.uid()
--   ))
-- PostgreSQL detects this as infinite recursion and throws 42P17.
-- Since the backend uses service_role (bypasses RLS entirely),
-- the policy only needs to allow users to see their own rows.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "project_members_read" ON project_members;

CREATE POLICY "project_members_read" ON project_members
  FOR SELECT USING (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 2. Add 'removed_member' to activity_logs action CHECK constraint
--
-- membersService.removeMember logs a 'removed_member' action but
-- the original CHECK constraint didn't include it, causing inserts
-- to fail with a constraint violation.
-- ---------------------------------------------------------------
ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_action_check;

ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_action_check CHECK (action IN (
    'created_project',
    'updated_project',
    'created_issue',
    'updated_issue',
    'closed_issue',
    'assigned_issue',
    'added_member',
    'removed_member'
  ));
