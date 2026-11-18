import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  CalendarRange,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useResource from '../hooks/useResource.js';
import apiClient from '../api/client.js';
import { downloadFile, downloadErrorMessage } from '../utils/download.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Select from '../components/ui/Select.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const TYPES = [
  { key: 'sessions', label: 'Sessions' },
  { key: 'students', label: 'Students' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'classes', label: 'Classes' },
];

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const fmtDate = (v) =>
  new Date(v).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

const pctBadge = (v) => (
  <span
    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
      v >= 75 ? 'bg-emerald-100 text-emerald-700' : v >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
    }`}
  >
    {v}%
  </span>
);
const numCell = (v) => <span className="tabular-nums font-medium">{v}</span>;

/** Report table columns per type (mirrors the server export columns). */
const columnsFor = (type) => {
  const statusCols = [
    { key: 'present', label: 'Pres', render: (r) => numCell(r.present) },
    { key: 'late', label: 'Late', render: (r) => numCell(r.late) },
    { key: 'absent', label: 'Abs', render: (r) => numCell(r.absent) },
    { key: 'leave', label: 'Leave', render: (r) => numCell(r.leave) },
    { key: 'total', label: 'Total', render: (r) => numCell(r.total) },
    { key: 'percentage', label: '%', render: (r) => pctBadge(r.percentage) },
  ];
  if (type === 'students') {
    return [
      { key: 'rollNumber', label: 'Roll No', render: (r) => <span className="font-semibold text-slate-700">{r.rollNumber}</span> },
      { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
      { key: 'className', label: 'Class', render: (r) => <span className="text-slate-600">{r.className}</span> },
      ...statusCols,
    ];
  }
  if (type === 'subjects') {
    return [
      { key: 'name', label: 'Subject', render: (r) => (<div><p className="font-medium text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.code}</p></div>) },
      { key: 'sessions', label: 'Sessions', render: (r) => numCell(r.sessions) },
      ...statusCols,
    ];
  }
  if (type === 'classes') {
    return [
      { key: 'name', label: 'Class', render: (r) => (<span className="font-medium text-slate-800">{r.name} {r.code ? <span className="text-xs text-slate-400">{r.code}</span> : null}</span>) },
      { key: 'sessions', label: 'Sessions', render: (r) => numCell(r.sessions) },
      ...statusCols,
    ];
  }
  // sessions
  return [
    { key: 'date', label: 'Date', render: (r) => <span className="font-medium text-slate-700">{fmtDate(r.date)}</span> },
    { key: 'className', label: 'Class', render: (r) => <span className="text-slate-600">{r.className}</span> },
    { key: 'subjectName', label: 'Subject', render: (r) => (<div><p className="font-medium text-slate-800">{r.subjectName}</p><p className="text-xs text-slate-400">{r.subjectCode}</p></div>) },
    { key: 'teacherName', label: 'Teacher', render: (r) => <span className="text-slate-600">{r.teacherName}</span> },
    ...statusCols,
  ];
};

/**
 * Dedicated Reports section (Phase 7) - shared by admin and teacher:
 * the server scopes teacher access automatically. Types: sessions (daily),
 * students (student-wise), subjects, classes. Date-range presets cover
 * daily/weekly/monthly/semester; PDF + Excel export of the FULL result set.
 */
export default function ReportsPage({
  title = 'Reports & Analytics',
  subtitle = 'Daily, weekly, monthly and student/subject/class-wise attendance reports.',
}) {
  const toast = useToast();

  const [type, setType] = useState('sessions');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [options, setOptions] = useState({ classes: [], subjects: [] });
  const [trend, setTrend] = useState([]);
  const [exporting, setExporting] = useState('');

  const report = useResource('/reports', { limit: 10, initialFilters: { type: 'sessions' } });
  const [searchParams] = useSearchParams();

  // Teacher quick search (topbar) lands here as ?search=...
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) report.setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    report.setFilter('type', type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
  useEffect(() => {
    report.setFilter('from', from);
    report.setFilter('to', to);
    report.setFilter('class', classId);
    report.setFilter('subject', subjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, classId, subjectId]);

  // filter dropdown data (role-scoped by the server)
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/reports/options')
      .then(({ data }) => {
        if (!cancelled) setOptions(data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // trend chart data (same date/class/subject filters)
  useEffect(() => {
    let cancelled = false;
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (classId) params.class = classId;
    if (subjectId) params.subject = subjectId;
    apiClient
      .get('/reports/trend', { params })
      .then(({ data }) => {
        if (!cancelled) setTrend(data.data.points);
      })
      .catch(() => {
        if (!cancelled) setTrend([]);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, classId, subjectId]);

  const applyPreset = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      setFrom(iso(today));
      setTo(iso(today));
    } else if (preset === 'week') {
      setFrom(iso(addDays(today, -6)));
      setTo(iso(today));
    } else if (preset === 'month') {
      setFrom(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
      setTo(iso(today));
    } else if (preset === 'semester') {
      setFrom(iso(addDays(today, -180)));
      setTo(iso(today));
    } else {
      setFrom('');
      setTo('');
    }
  };

  const exportParams = () => {
    const p = { type };
    if (from) p.from = from;
    if (to) p.to = to;
    if (classId) p.class = classId;
    if (subjectId) p.subject = subjectId;
    if (report.search) p.search = report.search;
    return p;
  };

  const doExport = async (kind) => {
    setExporting(kind);
    try {
      const name = await downloadFile(
        `/reports/export/${kind}`,
        exportParams(),
        `attendance-${type}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`
      );
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      toast.error(downloadErrorMessage(err));
    } finally {
      setExporting('');
    }
  };

  const summary = report.extra?.summary;
  const summaryChips = summary
    ? [
        { label: 'Present', value: summary.present, tone: 'text-emerald-600' },
        { label: 'Late', value: summary.late, tone: 'text-amber-600' },
        { label: 'Absent', value: summary.absent, tone: 'text-rose-600' },
        { label: 'Leave', value: summary.leave, tone: 'text-sky-600' },
        { label: 'Total records', value: summary.total, tone: 'text-navy-900' },
        { label: 'Overall', value: `${summary.percentage}%`, tone: summary.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600' },
      ]
    : [];

  const hasFilters = Boolean(from || to || classId || subjectId);

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => doExport('pdf')} loading={exporting === 'pdf'} disabled={Boolean(exporting)}>
              <FileText size={16} /> PDF
            </Button>
            <Button onClick={() => doExport('excel')} loading={exporting === 'excel'} disabled={Boolean(exporting)}>
              <FileSpreadsheet size={16} /> Excel
            </Button>
          </div>
        }
      />

      {/* ---------- filters ---------- */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          {/* report type */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Report type</label>
            <div className="flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    type === t.key ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-navy-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* date presets */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Quick range</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                ['today', 'Daily'],
                ['week', 'Week'],
                ['month', 'Month'],
                ['semester', 'Semester'],
                ['all', 'All time'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-300 hover:text-purple-700"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="min-w-[170px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Class</label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {options.classes?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.section ? ` - ${c.section}` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[170px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Subject</label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All subjects</option>
              {options.subjects?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setFrom('');
                setTo('');
                setClassId('');
                setSubjectId('');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* ---------- summary chips ---------- */}
      {summaryChips.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {summaryChips.map((chip) => (
            <div key={chip.label} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{chip.label}</p>
              <p className={`mt-0.5 text-lg font-bold tabular-nums ${chip.tone}`}>{chip.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---------- trend chart ---------- */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <CalendarRange size={16} className="text-purple-600" /> Daily attendance trend
          </h3>
          <span className="text-xs text-slate-400">dashed line = 75% minimum</span>
        </div>
        {trend.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Attendance']}
                labelFormatter={(l) => `Date: ${l}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <ReferenceLine
                y={75}
                stroke="#f43f5e"
                strokeDasharray="6 4"
                label={{ value: '75%', position: 'insideTopRight', fontSize: 10, fill: '#f43f5e' }}
              />
              <Area type="monotone" dataKey="percentage" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="No trend data"
            description="Daily attendance percentages appear here once sessions are marked in the selected range."
          />
        )}
      </Card>

      {/* ---------- result table ---------- */}
      <DataTable
        columns={columnsFor(type)}
        items={report.items}
        loading={report.loading}
        error={report.error}
        minWidth={860}
        search={report.search}
        onSearch={report.setSearch}
        searchPlaceholder="Search name, roll no, class or subject..."
        emptyTitle="No report data"
        emptyDescription={
          hasFilters || report.search
            ? 'Nothing matches the selected filters - try widening the date range.'
            : 'Attendance reports appear here once classes are marked.'
        }
        meta={report.meta}
        onPageChange={report.setPage}
      />
    </div>
  );
}
