/**
 * Format an ISO timestamp as a relative time string.
 * e.g. "just now", "5 minutes ago", "3 hours ago", "2 days ago"
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHr < 24) return rtf.format(-diffHr, 'hour');
  if (diffDay < 30) return rtf.format(-diffDay, 'day');
  return formatDate(isoString);
}

/**
 * Format an ISO date/timestamp as "Mar 21, 2026"
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get initials from a full name (up to 2 characters).
 */
export function getInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Extract a user-readable error message from an Axios error.
 */
export function extractErrorMessage(err) {
  return (
    err?.response?.data?.error?.message ||
    err?.message ||
    'An unexpected error occurred'
  );
}

/**
 * Trigger a browser download of a text file.
 */
export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate a markdown export for an entire project including all its issues.
 */
export function generateProjectMarkdown(project, issues, members) {
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const slug = (project.name || 'project').toLowerCase().replace(/\s+/g, '-');

  const lines = [];

  lines.push(`# ${project.name}`);
  lines.push(`> Exported from ProjectFlow on ${now}`);
  lines.push('');

  // Overview
  lines.push('## Project Overview');
  lines.push(`- **Status:** ${project.status?.replace('_', ' ')}`);
  if (project.description) lines.push(`- **Description:** ${project.description}`);
  if (project.start_date) lines.push(`- **Start Date:** ${formatDate(project.start_date)}`);
  if (project.end_date) lines.push(`- **End Date:** ${formatDate(project.end_date)}`);
  lines.push('');

  // Team
  if (members?.length) {
    lines.push('## Team');
    members.forEach((m) => {
      lines.push(`- **${m.profiles?.full_name || 'Unknown'}** (${m.role}) — ${m.profiles?.email || ''}`);
    });
    lines.push('');
  }

  // Issues grouped by status
  const groups = [
    { label: 'Open Issues', status: 'open' },
    { label: 'In Progress', status: 'in_progress' },
    { label: 'Closed Issues', status: 'closed' },
  ];

  groups.forEach(({ label, status }) => {
    const group = (issues || []).filter((i) => i.status === status);
    if (!group.length) return;

    lines.push(`## ${label} (${group.length})`);
    lines.push('');

    group.forEach((issue) => {
      const priority = issue.priority ? `[${issue.priority.toUpperCase()}]` : '';
      lines.push(`### ${priority} ${issue.title}`);
      lines.push('');
      if (issue.description) {
        lines.push(issue.description);
        lines.push('');
      }
      lines.push('**Details:**');
      lines.push(`- Priority: ${issue.priority || '—'}`);
      lines.push(`- Assignee: ${issue.assignee?.full_name || 'Unassigned'}`);
      lines.push(`- Reporter: ${issue.reporter?.full_name || '—'}`);
      lines.push(`- Created: ${formatDate(issue.created_at)}`);
      if (issue.due_date) lines.push(`- Due: ${formatDate(issue.due_date)}`);
      if (issue.closed_at) lines.push(`- Closed: ${formatDate(issue.closed_at)}`);
      lines.push('');
    });
  });

  const filename = `projectflow-${slug}.md`;
  return { content: lines.join('\n'), filename };
}

/**
 * Generate a markdown export for a single issue.
 */
export function generateIssueMarkdown(issue, projectName) {
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const slug = (issue.title || 'issue').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const lines = [];

  lines.push(`# ${issue.title}`);
  lines.push(`> Exported from ProjectFlow on ${now}${projectName ? ` · Project: ${projectName}` : ''}`);
  lines.push('');

  lines.push('## Overview');
  lines.push(`- **Status:** ${issue.status?.replace('_', ' ')}`);
  lines.push(`- **Priority:** ${issue.priority}`);
  lines.push(`- **Reporter:** ${issue.reporter?.full_name || '—'}`);
  lines.push(`- **Assignee:** ${issue.assignee?.full_name || 'Unassigned'}`);
  lines.push(`- **Created:** ${formatDate(issue.created_at)}`);
  if (issue.due_date) lines.push(`- **Due:** ${formatDate(issue.due_date)}`);
  if (issue.closed_at) lines.push(`- **Closed:** ${formatDate(issue.closed_at)}`);
  lines.push('');

  lines.push('## Description');
  lines.push(issue.description?.trim() || '_No description provided._');
  lines.push('');

  const filename = `issue-${slug}.md`;
  return { content: lines.join('\n'), filename };
}
