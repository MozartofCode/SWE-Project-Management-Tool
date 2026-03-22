import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import useIssues from '../hooks/useIssues';
import { extractErrorMessage } from '../services/utils';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'open',
  priority: 'medium',
  assignee_id: '',
  due_date: '',
};

export default function IssueForm() {
  const { id: projectId, issueId } = useParams();
  const isEdit = Boolean(issueId);
  const navigate = useNavigate();
  const { createIssue, updateIssue } = useIssues();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const load = async () => {
      setIsFetching(true);
      try {
        const [membersRes, issueData] = await Promise.all([
          apiClient.get(`/projects/${projectId}/members`),
          isEdit ? apiClient.get(`/projects/${projectId}/issues/${issueId}`) : Promise.resolve(null),
        ]);
        setMembers(membersRes.data.data);
        if (issueData) {
          const issue = issueData.data.data;
          setForm({
            title: issue.title || '',
            description: issue.description || '',
            status: issue.status || 'open',
            priority: issue.priority || 'medium',
            assignee_id: issue.assignee_id || '',
            due_date: issue.due_date || '',
          });
        }
      } catch (err) {
        setServerError(extractErrorMessage(err));
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [projectId, issueId, isEdit]);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    else if (form.title.length > 255) errs.title = 'Max 255 characters';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
    };

    setIsLoading(true);
    try {
      if (isEdit) {
        await updateIssue(projectId, issueId, payload);
        navigate(`/projects/${projectId}/issues/${issueId}`);
      } else {
        const issue = await createIssue(projectId, payload);
        navigate(`/projects/${projectId}/issues/${issue.id}`);
      }
    } catch (err) {
      setServerError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const selectClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  if (isFetching) {
    return (
      <div className="max-w-2xl animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-slate-200 rounded w-24" />
              <div className="h-10 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 mb-6">
        {isEdit ? 'Edit Issue' : 'New Issue'}
      </h2>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {serverError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.title ? 'border-rose-400' : 'border-slate-300'}`}
              placeholder="Describe the issue"
            />
            {errors.title && <p className="mt-1 text-rose-600 text-xs">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Provide more context…"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={selectClass}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className={selectClass}>
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
              <select name="assignee_id" value={form.assignee_id} onChange={handleChange} className={selectClass}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.full_name || m.user_id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
              <input
                name="due_date"
                type="date"
                value={form.due_date}
                onChange={handleChange}
                className={selectClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Create issue'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-slate-500 hover:text-slate-700 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
