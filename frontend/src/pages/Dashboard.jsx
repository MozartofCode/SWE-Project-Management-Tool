import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useProjects from '../hooks/useProjects';
import ActivityFeed from '../components/ActivityFeed';
import StatusBadge from '../components/StatusBadge';

function StatCard({ label, value, color, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
        <div className="h-8 bg-slate-200 rounded w-1/3" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, fetchProjects, isLoading } = useProjects();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const active = projects.filter((p) => p.status === 'active').length;
  const onHoldCompleted = projects.filter((p) => ['on_hold', 'completed'].includes(p.status)).length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-slate-500 mt-1">Here's what's happening across your projects.</p>
        </div>
        <Link
          to="/projects/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={projects.length} color="text-slate-800" isLoading={isLoading} />
        <StatCard label="Active Projects" value={active} color="text-emerald-600" isLoading={isLoading} />
        <StatCard label="On Hold / Completed" value={onHoldCompleted} color="text-amber-600" isLoading={isLoading} />
        <StatCard label="Archived" value={projects.filter(p => p.status === 'archived').length} color="text-slate-500" isLoading={isLoading} />
      </div>

      {/* Recent projects + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent projects */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Recent Projects</h3>
            <Link to="/projects" className="text-sm text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm mb-3">No projects yet.</p>
              <Link to="/projects/new" className="text-indigo-600 text-sm font-medium hover:text-indigo-700">
                Create your first project →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800 truncate">{p.name}</span>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
