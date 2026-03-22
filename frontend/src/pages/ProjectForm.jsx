import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import useProjects from '../hooks/useProjects';
import { extractErrorMessage } from '../services/utils';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const EMPTY_FORM = { name: '', description: '', status: 'active', start_date: '', end_date: '' };

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { createProject, updateProject, fetchProject } = useProjects();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const p = await fetchProject(id);
        setForm({
          name: p.name || '',
          description: p.description || '',
          status: p.status || 'active',
          start_date: p.start_date || '',
          end_date: p.end_date || '',
        });
      } catch (err) {
        setServerError(extractErrorMessage(err));
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [id, isEdit, fetchProject]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    else if (form.name.length > 200) errs.name = 'Max 200 characters';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      errs.end_date = 'End date must be on or after start date';
    }
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
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    setIsLoading(true);
    try {
      if (isEdit) {
        await updateProject(id, payload);
        navigate(`/projects/${id}`);
      } else {
        const p = await createProject(payload);
        navigate(`/projects/${p.id}`);
      }
    } catch (err) {
      setServerError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="max-w-2xl animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
        {isEdit ? 'Edit Project' : 'New Project'}
      </h2>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {serverError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project name <span className="text-rose-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.name ? 'border-rose-400' : 'border-slate-300'}`}
              placeholder="My awesome project"
            />
            {errors.name && <p className="mt-1 text-rose-600 text-xs">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="What is this project about?"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
              <input
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
              <input
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.end_date ? 'border-rose-400' : 'border-slate-300'}`}
              />
              {errors.end_date && <p className="mt-1 text-rose-600 text-xs">{errors.end_date}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
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
