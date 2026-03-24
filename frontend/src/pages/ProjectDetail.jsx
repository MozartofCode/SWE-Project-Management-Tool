import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useProjects from '../hooks/useProjects';
import useIssues from '../hooks/useIssues';
import apiClient from '../services/api';
import StatusBadge from '../components/StatusBadge';
import IssueTable from '../components/IssueTable';
import FilterBar from '../components/FilterBar';
import ActivityFeed from '../components/ActivityFeed';
import { formatDate, getInitials, extractErrorMessage, downloadFile, generateProjectMarkdown } from '../services/utils';
import useAnthropicKey from '../hooks/useAnthropicKey';
import AnthropicKeyModal from '../components/AnthropicKeyModal';

const TABS = ['Issues', 'Members', 'Activity'];

const ROLE_COLORS = {
  manager:   'bg-indigo-100 text-indigo-700',
  developer: 'bg-slate-100 text-slate-700',
  viewer:    'bg-gray-100 text-gray-600',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchProject } = useProjects();
  const { issues, isLoading: issuesLoading, filters, fetchIssues, setFilters } = useIssues();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Issues');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Add member state
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('developer');
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  const { hasKey: hasAnthropicKey, setHasKey: setHasAnthropicKey } = useAnthropicKey();

  useEffect(() => {
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const isManager = myRole === 'manager';
  const isAdmin = user?.role === 'admin';
  const canManageMembers = isManager && isAdmin; // need both to fetch user list

  const loadProject = useCallback(async () => {
    try {
      const p = await fetchProject(id);
      setProject(p);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [id, fetchProject]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await apiClient.get(`/projects/${id}/members`);
      setMembers(res.data.data);
    } catch {
      // non-fatal
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadProject(), loadMembers()]);
      setIsLoading(false);
    };
    init();
  }, [loadProject, loadMembers]);

  useEffect(() => {
    if (activeTab === 'Issues') {
      fetchIssues(id, { sort: sortField, order: sortOrder });
    }
  }, [id, activeTab, fetchIssues, sortField, sortOrder]);

  // Load users list for Add Member (admin only)
  useEffect(() => {
    if (canManageMembers && activeTab === 'Members') {
      apiClient.get('/users').then((res) => setUsers(res.data.data)).catch(() => {});
    }
  }, [canManageMembers, activeTab]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchIssues(id, newFilters);
  };

  const handleSort = (field, order) => {
    setSortField(field);
    setSortOrder(order);
    fetchIssues(id, { sort: field, order });
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await apiClient.delete(`/projects/${id}/members/${userId}`);
      loadMembers();
    } catch {
      alert('Failed to remove member.');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addMemberUserId) { setAddMemberError('Select a user'); return; }
    setAddMemberLoading(true);
    setAddMemberError('');
    try {
      await apiClient.post(`/projects/${id}/members`, { user_id: addMemberUserId, role: addMemberRole });
      setAddMemberUserId('');
      setAddMemberRole('developer');
      loadMembers();
    } catch (err) {
      setAddMemberError(extractErrorMessage(err));
    } finally {
      setAddMemberLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="h-4 bg-slate-200 rounded w-96" />
        <div className="h-48 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-6">
        <p>{error}</p>
        <Link to="/projects" className="text-rose-600 font-medium text-sm mt-2 block">← Back to projects</Link>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Project header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link to="/projects" className="text-slate-400 hover:text-slate-600 text-sm">Projects</Link>
              <span className="text-slate-300">/</span>
              <h2 className="text-2xl font-bold text-slate-800">{project.name}</h2>
              <StatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="text-slate-500">{project.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-400">
              {project.start_date && <span>Start: {formatDate(project.start_date)}</span>}
              {project.end_date && <span>End: {formatDate(project.end_date)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 bg-white px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-10 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20">
                  <button
                    onClick={() => {
                      const { content, filename } = generateProjectMarkdown(project, issues, members);
                      downloadFile(filename, content);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div>
                      <p className="font-medium">Export .md</p>
                      <p className="text-xs text-slate-400">Instant download</p>
                    </div>
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      if (!hasAnthropicKey) { setShowKeyModal(true); return; }
                      setIsExporting(true);
                      try {
                        const res = await apiClient.get(`/projects/${id}/export`);
                        downloadFile(res.data.data.filename, res.data.data.content);
                      } catch {
                        alert('AI export failed. Check your Anthropic API key via your profile menu.');
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    disabled={isExporting}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2.5 disabled:opacity-50"
                  >
                    <span className="text-base shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>✦</span>
                    <div>
                      <p className="font-semibold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isExporting ? 'Generating…' : 'AI Export'}
                      </p>
                      <p className="text-xs text-slate-400">Claude-powered spec</p>
                    </div>
                    {isExporting && <span className="ml-auto w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />}
                  </button>
                </div>
              )}
            </div>

            {(isManager || isAdmin) && (
              <Link
                to={`/projects/${id}/edit`}
                className="text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 bg-white px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Edit
              </Link>
            )}
            <Link
              to={`/projects/${id}/issues/new`}
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Issue
            </Link>

            {showKeyModal && (
              <AnthropicKeyModal
                onClose={() => setShowKeyModal(false)}
                onSaved={() => { setHasAnthropicKey(true); setShowKeyModal(false); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
            {tab === 'Issues' && (
              <span className="ml-1.5 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                {issues.length}
              </span>
            )}
            {tab === 'Members' && (
              <span className="ml-1.5 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                {members.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Issues' && (
        <div className="space-y-4">
          <FilterBar filters={filters} onFilterChange={handleFilterChange} members={members} />
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <IssueTable
              issues={issues}
              projectId={id}
              onSort={handleSort}
              sortField={sortField}
              sortOrder={sortOrder}
              isLoading={issuesLoading}
            />
          </div>
        </div>
      )}

      {activeTab === 'Members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {members.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">No members found.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold shrink-0">
                      {getInitials(m.profiles?.full_name || '?')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.profiles?.full_name}</p>
                      <p className="text-xs text-slate-400">{m.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[m.role] || 'bg-slate-100 text-slate-600'}`}>
                      {m.role}
                    </span>
                    {isManager && m.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-xs text-rose-500 hover:text-rose-700 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add member — admin + manager only */}
          {canManageMembers && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-800 mb-3">Add Member</h4>
              {addMemberError && (
                <p className="text-rose-600 text-sm mb-2">{addMemberError}</p>
              )}
              <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-slate-600 mb-1">User</label>
                  <select
                    value={addMemberUserId}
                    onChange={(e) => setAddMemberUserId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a user…</option>
                    {users
                      .filter((u) => !members.find((m) => m.user_id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                  <select
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value)}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="developer">Developer</option>
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addMemberLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {addMemberLoading ? 'Adding…' : 'Add'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Activity' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <ActivityFeed projectId={id} />
        </div>
      )}
    </div>
  );
}
