import { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { formatRelativeTime, getInitials } from '../services/utils';

const ACTION_DOTS = {
  created_project: 'bg-emerald-500',
  created_issue:   'bg-emerald-500',
  updated_project: 'bg-blue-500',
  updated_issue:   'bg-blue-500',
  assigned_issue:  'bg-amber-500',
  closed_issue:    'bg-slate-400',
  added_member:    'bg-indigo-500',
  removed_member:  'bg-rose-400',
};

function SkeletonRow() {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-2.5 bg-slate-200 rounded w-1/4" />
      </div>
    </div>
  );
}

export default function ActivityFeed({ projectId }) {
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = projectId ? `/projects/${projectId}/activity` : '/activity';
        const res = await apiClient.get(url);
        if (!cancelled) setActivity(res.data.data);
      } catch {
        if (!cancelled) setError('Failed to load activity.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-500 py-4">{error}</p>;
  }

  if (activity.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">No activity yet.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {activity.map((entry) => {
        const author = entry.profiles;
        const dotColor = ACTION_DOTS[entry.action] || 'bg-slate-300';
        return (
          <div key={entry.id} className="flex gap-3 py-3">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
                {author ? getInitials(author.full_name) : '?'}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">{entry.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(entry.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
