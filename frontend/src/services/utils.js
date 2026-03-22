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
