import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { formatDate } from '../services/utils';

const SORTABLE = ['title', 'status', 'priority', 'due_date', 'created_at'];

function SortIcon({ field, current, order }) {
  if (current !== field) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-indigo-500">{order === 'asc' ? '↑' : '↓'}</span>;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-3 bg-slate-200 rounded w-16" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-48" /></td>
      <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded-full w-20" /></td>
      <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded-full w-16" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-20" /></td>
    </tr>
  );
}

export default function IssueTable({ issues, projectId, onSort, sortField, sortOrder, isLoading }) {
  const navigate = useNavigate();

  const handleSort = (field) => {
    if (!SORTABLE.includes(field)) return;
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, newOrder);
  };

  const th = (label, field) => (
    <th
      onClick={() => field && handleSort(field)}
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${field && SORTABLE.includes(field) ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
    >
      {label}
      {field && <SortIcon field={field} current={sortField} order={sortOrder} />}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {th('#', null)}
            {th('Title', 'title')}
            {th('Status', 'status')}
            {th('Priority', 'priority')}
            {th('Assignee', null)}
            {th('Due Date', 'due_date')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : issues.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center">
                <p className="text-slate-400 text-sm">No issues found.</p>
                <button
                  onClick={() => navigate(`/projects/${projectId}/issues/new`)}
                  className="mt-2 text-indigo-600 text-sm font-medium hover:text-indigo-700"
                >
                  Create the first issue →
                </button>
              </td>
            </tr>
          ) : (
            issues.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {issue.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-indigo-600">{issue.title}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {issue.assignee?.full_name || <span className="text-slate-400 italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDate(issue.due_date)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
