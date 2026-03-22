-- ============================================================
-- Migration 003 — Add INSERT / UPDATE / DELETE RLS policies
--
-- The original migration only added SELECT policies. All write
-- operations from the backend use the service_role key (which
-- bypasses RLS), but PostgREST requires at least a permissive
-- write policy to exist for certain query shapes.
-- The backend service layer enforces the real business rules;
-- these policies are the secondary defense layer ensuring only
-- authenticated sessions can ever reach the DB directly.
-- ============================================================

-- ---------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- PROJECT MEMBERS
-- ---------------------------------------------------------------
CREATE POLICY "project_members_insert" ON project_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "project_members_update" ON project_members
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_members_delete" ON project_members
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- ISSUES
-- ---------------------------------------------------------------
CREATE POLICY "issues_insert" ON issues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "issues_update" ON issues
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "issues_delete" ON issues
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- ACTIVITY LOGS
-- ---------------------------------------------------------------
CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------
-- REPORTS (Phase 2 scaffold)
-- ---------------------------------------------------------------
CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
