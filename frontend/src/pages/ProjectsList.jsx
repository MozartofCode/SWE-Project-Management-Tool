import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useProjects from '../hooks/useProjects';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../services/utils';

const STATUSES = ['active', 'on_hold', 'completed', 'archived'];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-40" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-slate-200 rounded-full w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-56" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
    </tr>
  );
}

export default function ProjectsList() {
  const navigate = useNavigate();
  const { projects, isLoading, error, fetchProjects, deleteProject } = useProjects();
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (e, id, name) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(id);
      fetchProjects();
    } catch {
      alert('Failed to delete project.');
    }
  };

  const filtered = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Projects</h2>
        <Link
          to="/projects/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="text-sm text-slate-500 hover:text-slate-700">
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Name', 'Status', 'Description', 'Start Date', 'End Date', 'Actions'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  {projects.length === 0 ? (
                    <div>
                      <p className="text-slate-400 mb-2">You're not a member of any projects yet.</p>
                      <Link to="/projects/new" className="text-indigo-600 font-medium text-sm hover:text-indigo-700">
                        Create your first project →
                      </Link>
                    </div>
                  ) : (
                    <p className="text-slate-400">No projects match the selected filter.</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-indigo-600">{project.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500 line-clamp-1">
                      {project.description || <span className="italic text-slate-400">No description</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(project.start_date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(project.end_date)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/projects/${project.id}/edit`)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id, project.name)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
