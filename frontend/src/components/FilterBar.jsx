const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function FilterBar({ filters, onFilterChange, members = [] }) {
  const hasFilters = filters.status || filters.priority || filters.assignee_id;

  const update = (key, value) => onFilterChange({ ...filters, [key]: value });

  const selectClass =
    'text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={filters.status} onChange={(e) => update('status', e.target.value)} className={selectClass}>
        <option value="">All Statuses</option>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <select value={filters.priority} onChange={(e) => update('priority', e.target.value)} className={selectClass}>
        <option value="">All Priorities</option>
        {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      <select value={filters.assignee_id} onChange={(e) => update('assignee_id', e.target.value)} className={selectClass}>
        <option value="">All Assignees</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.profiles?.full_name || m.user_id}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => onFilterChange({ ...filters, status: '', priority: '', assignee_id: '' })}
          className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
