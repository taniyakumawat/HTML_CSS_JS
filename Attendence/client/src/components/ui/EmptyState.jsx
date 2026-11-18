import { Inbox } from 'lucide-react';

/**
 * Friendly empty state for tables/pages with no data.
 */
export default function EmptyState({ icon: Icon = Inbox, title = 'No data yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={26} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
