const PRIORITY_MAP = {
  low:      { label: 'Low',      classes: 'bg-slate-100 text-slate-600 font-medium' },
  medium:   { label: 'Medium',   classes: 'bg-blue-100 text-blue-700 font-medium' },
  high:     { label: 'High',     classes: 'bg-amber-100 text-amber-700 font-medium' },
  critical: { label: 'Critical', classes: 'bg-rose-100 text-rose-700 font-semibold' },
};

export default function PriorityBadge({ priority }) {
  const config = PRIORITY_MAP[priority] || { label: priority, classes: 'bg-slate-100 text-slate-600 font-medium' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${config.classes}`}>
      {config.label}
    </span>
  );
}
