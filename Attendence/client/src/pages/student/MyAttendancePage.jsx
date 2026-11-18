import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, FileDown, List, X } from 'lucide-react';
import useResource from '../../hooks/useResource.js';
import apiClient from '../../api/client.js';
import { downloadFile, downloadErrorMessage } from '../../utils/download.js';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { STATUS_META, STATUS_OPTIONS } from '../../utils/constants.js';

const pad = (n) => String(n).padStart(2, '0');
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const dayKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const dateFmt = (v) =>
  new Date(v).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
const shiftMonth = (m, delta) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Color classes for a cell/row percentage (75% threshold). */
const pctColor = (pct) =>
  pct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
  : pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
  : 'bg-rose-50 text-rose-700 border-rose-200';

/**
 * Student's personal attendance: tabbed List | Calendar view.
 * Data comes from /api/student/attendance and /api/student/calendar (own records only).
 */
export default function MyAttendancePage() {
  const toast = useToast();
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(currentMonth);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const list = useResource('/student/attendance', {
    limit: 10,
    sort: '-date,periodNumber',
    initialFilters: { month: currentMonth() },
  });

  // subjects I actually have records for (drives the subject filter)
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/student/stats')
      .then(({ data }) => {
        if (!cancelled) setSubjects(data.data.subjectWise || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // month drives both the list filter and the calendar
  useEffect(() => {
    list.setFilter('month', month || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);
  useEffect(() => {
    list.setFilter('subject', subjectFilter);
    list.setFilter('status', statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, statusFilter]);

  // ---- calendar data ----
  const [calDays, setCalDays] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  useEffect(() => {
    if (view !== 'calendar' || !month) return;
    let cancelled = false;
    setCalLoading(true);
    apiClient
      .get('/student/calendar', { params: { month } })
      .then(({ data }) => {
        if (!cancelled) setCalDays(data.data.days);
      })
      .catch(() => {
        if (!cancelled) setCalDays([]);
      })
      .finally(() => {
        if (!cancelled) setCalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, month]);

  const calMap = useMemo(
    () => Object.fromEntries(calDays.map((d) => [d.date, d])),
    [calDays]
  );

  const grid = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay(); // Sun = 0
    const total = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }, [month]);

  const openCalendar = () => {
    if (!month) setMonth(currentMonth());
    setView('calendar');
  };

  /** Personal attendance report (own records only) -> PDF download. */
  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const name = await downloadFile('/student/report/pdf', {}, 'my-attendance.pdf');
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      toast.error(downloadErrorMessage(err));
    } finally {
      setPdfLoading(false);
    }
  };

  const columns = [
    { key: 'date', label: 'Date', render: (r) => (
      <span className="font-medium text-slate-700">{dateFmt(r.date)}</span>
    )},
    { key: 'periodNumber', label: 'Period', render: (r) => <span className="text-slate-500">#{r.periodNumber}</span> },
    { key: 'subject', label: 'Subject', render: (r) => (
      <div>
        <p className="font-medium text-slate-800">{r.subject?.name || '—'}</p>
        <p className="text-xs text-slate-400">{r.subject?.code}</p>
      </div>
    )},
    { key: 'class', label: 'Class', render: (r) => <span className="text-slate-600">{r.class?.name || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_META[r.status]?.color}`}>
        {STATUS_META[r.status]?.label}
      </span>
    )},
    { key: 'note', label: 'Note', render: (r) => (
      <span className="text-xs text-slate-400">{r.note || '—'}</span>
    )},
  ];

  const hasFilters = Boolean(subjectFilter || statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy-900">My Attendance</h2>
          <p className="text-sm text-slate-500">Your complete personal attendance record.</p>
        </div>
        {/* view toggle + personal PDF export */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={downloadPdf} loading={pdfLoading}>
            <FileDown size={16} /> Download PDF
          </Button>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                view === 'list' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'
              }`}
            >
              <List size={15} /> List
            </button>
            <button
              onClick={openCalendar}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                view === 'calendar' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'
              }`}
            >
              <CalendarDays size={15} /> Calendar
            </button>
          </div>
        </div>
      </div>

      {/* ---------- toolbar: filters shared by both views ---------- */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Month</label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setMonth(shiftMonth(month || currentMonth(), -1))}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Previous month"
              >
                <ChevronLeft size={15} />
              </button>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={() => setMonth(shiftMonth(month || currentMonth(), 1))}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Next month"
              >
                <ChevronRight size={15} />
              </button>
              {month && view === 'list' && (
                <button
                  onClick={() => setMonth('')}
                  className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50"
                  title="Search all time"
                  aria-label="Clear month filter"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="min-w-[170px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Subject</label>
            <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setSubjectFilter('');
                setStatusFilter('');
              }}
            >
              <X size={14} /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* ---------- LIST VIEW ---------- */}
      {view === 'list' && (
        <DataTable
          columns={columns}
          items={list.items}
          loading={list.loading}
          error={list.error}
          emptyTitle="No attendance records"
          emptyDescription={
            hasFilters || month
              ? 'Nothing matches your filters — try a different month or clear filters.'
              : 'Your attendance records appear here once classes are marked.'
          }
          meta={list.meta}
          onPageChange={list.setPage}
        />
      )}

      {/* ---------- CALENDAR VIEW ---------- */}
      {view === 'calendar' && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h3 className="text-sm font-bold text-navy-900">{monthLabel(month)}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> ≥ 75%</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" /> 50–74%</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-300" /> &lt; 50%</span>
            </div>
          </div>

          {calLoading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading calendar..." />
            </div>
          ) : !calDays.length ? (
            <EmptyState
              icon={CalendarDays}
              title="No sessions this month"
              description="Days with marked classes appear here."
            />
          ) : (
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="min-w-[340px]">
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {grid.map((d, i) => {
                    if (!d) return <div key={`pad-${i}`} />;
                    const [y, m] = month.split('-').map(Number);
                    const key = dayKey(y, m, d);
                    const day = calMap[key];
                    return (
                      <div
                        key={key}
                        title={day ? day.subjects.join('\n') : undefined}
                        className={`min-h-[64px] rounded-xl border p-1.5 text-left sm:p-2 ${
                          day
                            ? pctColor(day.percentage)
                            : 'border-slate-100 bg-slate-50/60 text-slate-300'
                        }`}
                      >
                        <p className="text-xs font-bold">{d}</p>
                        {day && (
                          <p className="mt-1 text-[10px] font-semibold leading-tight sm:text-[11px]">
                            {day.present}/{day.total} · {day.percentage}%
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
