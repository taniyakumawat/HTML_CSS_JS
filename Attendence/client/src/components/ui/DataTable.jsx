import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Spinner from './Spinner.jsx';
import EmptyState from './EmptyState.jsx';

/** Small icon button used in table action cells. */
export function RowButton({ icon: Icon, label, onClick, tone = 'default' }) {
  const tones = {
    default: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
    danger: 'text-rose-500 hover:bg-rose-50 hover:text-rose-700',
    success: 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700',
  };
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 transition ${tones[tone]}`}
    >
      <Icon size={16} />
    </button>
  );
}

/**
 * Reusable data table: search box, toolbar slot, loading/error/empty states
 * and pagination - all fed by useResource().
 */
export default function DataTable({
  columns,
  items,
  loading,
  error,
  search,
  onSearch,
  searchPlaceholder = 'Search...',
  toolbar,
  meta,
  onPageChange,
  emptyTitle = 'No records yet',
  emptyDescription,
  rowActions,
  minWidth = 560,
}) {
  const colSpan = columns.length + (rowActions ? 1 : 0);

  return (
    <div className="card overflow-hidden">
      {(onSearch || toolbar) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          {onSearch && (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>
          )}
          {toolbar && <div className="ml-0 flex flex-wrap items-center gap-2 sm:ml-auto">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-semibold ${c.className || ''}`}>
                  {c.label}
                </th>
              ))}
              {rowActions && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <Spinner label="Loading..." className="justify-center" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-rose-600">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row._id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle text-slate-700 ${c.className || ''}`}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">{rowActions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-5">
          <span>
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-slate-600">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => onPageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
