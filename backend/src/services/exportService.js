const Anthropic = require('@anthropic-ai/sdk');
const { supabaseAdmin } = require('./supabase');

async function getAnthropicClient(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('anthropic_api_key')
    .eq('id', userId)
    .single();
  const key = data?.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const err = new Error('No Anthropic API key configured. Add one in Settings.');
    err.status = 503;
    err.code = 'ANTHROPIC_NOT_CONFIGURED';
    throw err;
  }
  return new Anthropic({ apiKey: key });
}

async function generateProjectExport(projectId, userId) {
  // Fetch project
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (projectError) throw projectError;

  // Fetch all issues
  const { data: issues } = await supabaseAdmin
    .from('issues')
    .select('*, reporter:profiles!issues_reporter_id_fkey(full_name), assignee:profiles!issues_assignee_id_fkey(full_name)')
    .eq('project_id', projectId)
    .order('status')
    .order('priority', { ascending: false });

  // Fetch members
  const { data: members } = await supabaseAdmin
    .from('project_members')
    .select('role, profiles(full_name, email)')
    .eq('project_id', projectId);

  const rawData = {
    project: {
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
    },
    team: (members || []).map((m) => ({
      name: m.profiles?.full_name,
      email: m.profiles?.email,
      role: m.role,
    })),
    issues: (issues || []).map((i) => ({
      title: i.title,
      description: i.description || '',
      status: i.status,
      priority: i.priority,
      reporter: i.reporter?.full_name || 'Unknown',
      assignee: i.assignee?.full_name || 'Unassigned',
      created_at: i.created_at,
      due_date: i.due_date,
      closed_at: i.closed_at,
    })),
  };

  const prompt = `You are an expert software architect helping a developer use Claude Code to build their project.

Below is raw project data exported from ProjectFlow, a project management tool. Transform this into a perfectly structured markdown document that a developer can drop directly into Claude Code as context.

The output should:
- Start with a sharp, concise project overview Claude Code can immediately act on
- List all open and in-progress work as clear, actionable development tasks with acceptance criteria
- Group tasks logically by feature area or priority
- Include technical implementation hints and context where helpful
- Format closed/done items separately so Claude Code knows what's already complete
- Be opinionated and helpful — don't just reformat, actually improve the clarity and structure
- End with a "Getting Started" section suggesting the first 2-3 things Claude Code should do

Raw project data:
\`\`\`json
${JSON.stringify(rawData, null, 2)}
\`\`\`

Output only the markdown document, no preamble.`;

  const anthropic = await getAnthropicClient(userId);
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0].text;
  const slug = project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const filename = `projectflow-${slug}.md`;

  return { content, filename };
}

async function generateIssueExport(projectId, issueId, userId) {
  const { data: issue, error } = await supabaseAdmin
    .from('issues')
    .select('*, reporter:profiles!issues_reporter_id_fkey(full_name, email), assignee:profiles!issues_assignee_id_fkey(full_name)')
    .eq('id', issueId)
    .eq('project_id', projectId)
    .single();
  if (error) throw error;

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();

  const rawData = {
    project: project?.name,
    issue: {
      title: issue.title,
      description: issue.description || '',
      status: issue.status,
      priority: issue.priority,
      reporter: issue.reporter?.full_name,
      assignee: issue.assignee?.full_name || 'Unassigned',
      created_at: issue.created_at,
      due_date: issue.due_date,
      closed_at: issue.closed_at,
    },
  };

  const prompt = `You are an expert software engineer helping a developer use Claude Code to implement a specific task.

Below is a single issue exported from ProjectFlow. Transform it into a focused, actionable markdown document that a developer can drop into Claude Code to implement this specific feature or fix.

The output should:
- Start with a clear one-line summary of what needs to be built
- Provide precise acceptance criteria as a checklist
- Include technical implementation guidance and approach
- Mention edge cases and things to watch out for
- If it's a bug, describe expected vs actual behavior clearly
- End with a "Implementation Plan" section with numbered steps Claude Code should follow

Raw issue data:
\`\`\`json
${JSON.stringify(rawData, null, 2)}
\`\`\`

Output only the markdown document, no preamble.`;

  const anthropic = await getAnthropicClient(userId);
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0].text;
  const slug = issue.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const filename = `issue-${slug}.md`;

  return { content, filename };
}

module.exports = { generateProjectExport, generateIssueExport };
