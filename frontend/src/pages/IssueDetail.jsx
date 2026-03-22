import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useIssues from '../hooks/useIssues';
import apiClient from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { formatDate, formatRelativeTime, getInitials, extractErrorMessage } from '../services/utils';

const STATUS_OPTIONS = ['open', 'in_progress', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

export default function IssueDetail() {
  const { id: projectId, issueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateIssue, deleteIssue } = useIssues();

  const [issue, setIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/projects/${projectId}/issues/${issueId}`);
        if (!cancelled) setIssue(res.data.data);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectId, issueId]);

  const handleFieldChange = async (field, value) => {
    if (!issue) return;
    const prev = issue[field];
    setIssue((i) => ({ ...i, [field]: value }));
    setSaveError('');
    setIsSaving(true);
    try {
      const updated = await updateIssue(projectId, issueId, { [field]: value });
      setIssue(updated);
    } catch (err) {
      setIssue((i) => ({ ...i, [field]: prev }));
      setSaveError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    try {
      await deleteIssue(projectId, issueId);
      navigate(`/projects/${projectId}`, { replace: true });
    } catch {
      alert('Failed to delete issue.');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-2/3" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 bg-slate-200 rounded" />)}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 bg-slate-200 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-6">
        <p>{error}</p>
        <Link to={`/projects/${projectId}`} className="text-rose-600 font-medium text-sm mt-2 block">← Back to project</Link>
      </div>
    );
  }

  if (!issue) return null;

  const isReporter = issue.reporter_id === user?.id;

  const selectClass = `w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50`;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/projects" className="hover:text-slate-700">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-slate-700">Project</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Issue</span>
      </div>

      {saveError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{saveError}</div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800 leading-tight">{issue.title}</h2>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Link
                  to={`/projects/${projectId}/issues/${issueId}/edit`}
                  className="text-sm text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Edit
                </Link>
                {isReporter && (
                  <button
                    onClick={handleDelete}
                    className="text-sm text-rose-500 hover:text-rose-700 border border-rose-200 hover:border-rose-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {issue.description ? (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{issue.description}</p>
            ) : (
              <p className="text-slate-400 text-sm italic">No description provided.</p>
            )}
          </div>

          {/* Meta info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400 mb-0.5">Reporter</dt>
                <dd className="font-medium text-slate-800">
                  {issue.reporter ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                        {getInitials(issue.reporter.full_name)}
                      </div>
                      {issue.reporter.full_name}
                    </div>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 mb-0.5">Created</dt>
                <dd className="font-medium text-slate-800">{formatDate(issue.created_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-400 mb-0.5">Updated</dt>
                <dd className="font-medium text-slate-800">{formatRelativeTime(issue.updated_at)}</dd>
              </div>
              {issue.closed_at && (
                <div>
                  <dt className="text-slate-400 mb-0.5">Closed</dt>
                  <dd className="font-medium text-slate-800">{formatDate(issue.closed_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Status
                {isSaving && <span className="ml-2 inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin align-middle" />}
              </label>
              <select
                value={issue.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                disabled={isSaving}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
              <select
                value={issue.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                disabled={isSaving}
                className={selectClass}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assignee</label>
              {issue.assignee ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
                    {getInitials(issue.assignee.full_name)}
                  </div>
                  <span className="text-sm text-slate-700">{issue.assignee.full_name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">Unassigned</span>
              )}
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Due Date</label>
              <span className="text-sm text-slate-700">{formatDate(issue.due_date)}</span>
            </div>

            {/* Badges */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
