/**
 * White rounded card container used across all dashboards.
 */
export default function Card({ children, className = '', padding = true }) {
  return (
    <div className={`card ${padding ? 'p-5 sm:p-6' : ''} ${className}`}>{children}</div>
  );
}

/**
 * Small stat card for dashboard counters.
 */
export function StatCard({ icon: Icon, label, value, accent = 'text-purple-600 bg-purple-50', hint }) {
  return (
    <div className="card flex items-start gap-4 p-5">
      {Icon && (
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={22} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
