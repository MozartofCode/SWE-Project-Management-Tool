const { supabaseAdmin } = require('./supabase');
const { logActivity } = require('./activityService');

const listProjects = async (userId) => {
  try {
    const { data: memberships, error: memberErr } = await supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    if (memberErr) throw memberErr;

    const projectIds = memberships.map((m) => m.project_id);
    if (projectIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const createProject = async (
  userId,
  { name, description, status, start_date, end_date }
) => {
  try {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description: description || null,
        status: status || 'active',
        start_date: start_date || null,
        end_date: end_date || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-add creator as manager
    await supabaseAdmin
      .from('project_members')
      .insert({ project_id: project.id, user_id: userId, role: 'manager' });

    await logActivity({
      project_id: project.id,
      user_id: userId,
      action: 'created_project',
      description: `Project "${name}" was created`,
    });

    return project;
  } catch (err) {
    throw err;
  }
};

const getProjectById = async (projectId, userId) => {
  try {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const updateProject = async (projectId, userId, updates) => {
  try {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (member.role === 'viewer') {
      const err = new Error('Insufficient permissions to update project');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const ALLOWED = ['name', 'description', 'status', 'start_date', 'end_date'];
    const sanitized = { updated_at: new Date().toISOString() };
    for (const key of ALLOWED) {
      if (updates[key] !== undefined) sanitized[key] = updates[key];
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(sanitized)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    await logActivity({
      project_id: projectId,
      user_id: userId,
      action: 'updated_project',
      description: `Project "${data.name}" was updated`,
      metadata: sanitized,
    });

    return data;
  } catch (err) {
    throw err;
  }
};

const deleteProject = async (projectId, userId, userRole) => {
  try {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      const err = new Error('Project not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (member.role !== 'manager' && userRole !== 'admin') {
      const err = new Error('Only managers and admins can delete projects');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  listProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
};
