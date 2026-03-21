const { supabaseAdmin } = require('./supabase');

const logActivity = async ({
  project_id,
  issue_id = null,
  user_id,
  action,
  description,
  metadata = null,
}) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .insert({ project_id, issue_id, user_id, action, description, metadata })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    // Activity logging must never crash core operations
    console.error('[ActivityLog] Failed to write activity:', err.message);
  }
};

const getRecentActivity = async (userId, limit = 20) => {
  try {
    const { data: memberships, error: memberErr } = await supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    if (memberErr) throw memberErr;

    const projectIds = memberships.map((m) => m.project_id);

    if (projectIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*, profiles(id, full_name, email)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const getProjectActivity = async (projectId, limit = 50) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*, profiles(id, full_name, email)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

module.exports = { logActivity, getRecentActivity, getProjectActivity };
