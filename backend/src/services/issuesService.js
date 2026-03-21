const { supabaseAdmin } = require('./supabase');
const { logActivity } = require('./activityService');

const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'due_date', 'priority', 'status'];

const checkProjectMembership = async (projectId, userId) => {
  const { data } = await supabaseAdmin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();
  return data;
};

const listIssues = async (projectId, userId, filters = {}) => {
  try {
    const member = await checkProjectMembership(projectId, userId);
    if (!member) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    let query = supabaseAdmin
      .from('issues')
      .select(
        '*, assignee:profiles!assignee_id(id, full_name, email), reporter:profiles!reporter_id(id, full_name, email)'
      )
      .eq('project_id', projectId);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);

    const sortField = ALLOWED_SORT_FIELDS.includes(filters.sort)
      ? filters.sort
      : 'created_at';
    const ascending = filters.order === 'asc';
    query = query.order(sortField, { ascending });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const createIssue = async (
  projectId,
  userId,
  { title, description, status, priority, assignee_id, due_date }
) => {
  try {
    const member = await checkProjectMembership(projectId, userId);
    if (!member) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (assignee_id) {
      const assigneeMember = await checkProjectMembership(projectId, assignee_id);
      if (!assigneeMember) {
        const err = new Error('Assignee must be a project member');
        err.status = 400;
        err.code = 'INVALID_ASSIGNEE';
        throw err;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('issues')
      .insert({
        project_id: projectId,
        title,
        description: description || null,
        status: status || 'open',
        priority: priority || 'medium',
        assignee_id: assignee_id || null,
        reporter_id: userId,
        due_date: due_date || null,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity({
      project_id: projectId,
      issue_id: data.id,
      user_id: userId,
      action: 'created_issue',
      description: `Issue "${title}" was created`,
    });

    return data;
  } catch (err) {
    throw err;
  }
};

const getIssueById = async (projectId, issueId, userId) => {
  try {
    const member = await checkProjectMembership(projectId, userId);
    if (!member) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('issues')
      .select(
        '*, assignee:profiles!assignee_id(id, full_name, email), reporter:profiles!reporter_id(id, full_name, email)'
      )
      .eq('id', issueId)
      .eq('project_id', projectId)
      .single();

    if (error || !data) {
      const err = new Error('Issue not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return data;
  } catch (err) {
    throw err;
  }
};

const updateIssue = async (projectId, issueId, userId, updates) => {
  try {
    const member = await checkProjectMembership(projectId, userId);
    if (!member) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { data: currentIssue, error: fetchError } = await supabaseAdmin
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !currentIssue) {
      const err = new Error('Issue not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (updates.assignee_id && updates.assignee_id !== currentIssue.assignee_id) {
      const assigneeMember = await checkProjectMembership(
        projectId,
        updates.assignee_id
      );
      if (!assigneeMember) {
        const err = new Error('Assignee must be a project member');
        err.status = 400;
        err.code = 'INVALID_ASSIGNEE';
        throw err;
      }
    }

    const ALLOWED = [
      'title',
      'description',
      'status',
      'priority',
      'assignee_id',
      'due_date',
    ];
    const sanitized = { updated_at: new Date().toISOString() };
    for (const key of ALLOWED) {
      if (updates[key] !== undefined) sanitized[key] = updates[key];
    }

    if (sanitized.status === 'closed' && currentIssue.status !== 'closed') {
      sanitized.closed_at = new Date().toISOString();
    } else if (sanitized.status && sanitized.status !== 'closed') {
      sanitized.closed_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from('issues')
      .update(sanitized)
      .eq('id', issueId)
      .select()
      .single();

    if (error) throw error;

    // Determine the most specific activity action
    let action = 'updated_issue';
    let description = `Issue "${data.title}" was updated`;
    const metadata = {};

    if (sanitized.status && sanitized.status !== currentIssue.status) {
      metadata.old_status = currentIssue.status;
      metadata.new_status = sanitized.status;
      if (sanitized.status === 'closed') {
        action = 'closed_issue';
        description = `Issue "${data.title}" was closed`;
      } else {
        description = `Issue "${data.title}" status changed to ${sanitized.status}`;
      }
    }

    if (
      sanitized.assignee_id !== undefined &&
      sanitized.assignee_id !== currentIssue.assignee_id
    ) {
      action = 'assigned_issue';
      description = `Issue "${data.title}" was assigned`;
    }

    await logActivity({
      project_id: projectId,
      issue_id: issueId,
      user_id: userId,
      action,
      description,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });

    return data;
  } catch (err) {
    throw err;
  }
};

const deleteIssue = async (projectId, issueId, userId) => {
  try {
    const member = await checkProjectMembership(projectId, userId);
    if (!member) {
      const err = new Error('Project not found or access denied');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { error } = await supabaseAdmin
      .from('issues')
      .delete()
      .eq('id', issueId)
      .eq('project_id', projectId);

    if (error) throw error;
  } catch (err) {
    throw err;
  }
};

module.exports = { listIssues, createIssue, getIssueById, updateIssue, deleteIssue };
