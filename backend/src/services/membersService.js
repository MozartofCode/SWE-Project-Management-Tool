const { supabaseAdmin } = require('./supabase');
const { logActivity } = require('./activityService');

const listMembers = async (projectId, requesterId) => {
  try {
    const { data: requesterMembership } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', requesterId)
      .single();

    if (!requesterMembership) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('project_members')
      .select('*, profiles(id, full_name, email, avatar_url, role)')
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const addMember = async (projectId, requesterId, { user_id, role }) => {
  try {
    const { data: requesterMembership } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', requesterId)
      .single();

    if (!requesterMembership || requesterMembership.role === 'viewer') {
      const err = new Error('Insufficient permissions to add members');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user_id)
      .single();

    if (!userProfile) {
      const err = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('project_members')
      .insert({ project_id: projectId, user_id, role: role || 'developer' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const err = new Error('User is already a member of this project');
        err.status = 409;
        err.code = 'CONFLICT';
        throw err;
      }
      throw error;
    }

    await logActivity({
      project_id: projectId,
      user_id: requesterId,
      action: 'added_member',
      description: `${userProfile.full_name} was added to the project`,
    });

    return data;
  } catch (err) {
    throw err;
  }
};

const removeMember = async (projectId, requesterId, targetUserId) => {
  try {
    const { data: requesterMembership } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', requesterId)
      .single();

    if (!requesterMembership) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Allow removing self; otherwise requires manager role
    if (targetUserId !== requesterId && requesterMembership.role !== 'manager') {
      const err = new Error('Insufficient permissions to remove members');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const { error } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', targetUserId);

    if (error) throw error;
  } catch (err) {
    throw err;
  }
};

module.exports = { listMembers, addMember, removeMember };
