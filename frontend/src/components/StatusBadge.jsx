const STATUS_MAP = {
  // Issue statuses
  open:        { label: 'Open',        classes: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', classes: 'bg-amber-100 text-amber-700' },
  closed:      { label: 'Closed',      classes: 'bg-emerald-100 text-emerald-700' },
  // Project statuses
  active:      { label: 'Active',      classes: 'bg-emerald-100 text-emerald-700' },
  on_hold:     { label: 'On Hold',     classes: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Completed',   classes: 'bg-blue-100 text-blue-700' },
  archived:    { label: 'Archived',    classes: 'bg-slate-100 text-slate-600' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, classes: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}
