import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Percent,
  CheckCircle2,
  XCircle,
  Layers,
  AlertTriangle,
  CalendarCheck,
  FileDown,
} from 'lucide-react';
import { StatCard } from '../../components/ui/Card.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Button from '../../components/ui/Button.jsx';
import apiClient from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { downloadFile, downloadErrorMessage } from '../../utils/download.js';
import { STATUS_META } from '../../utils/constants.js';

const dateFmt = (v) =>
  new Date(v).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

/** Student dashboard - live data from GET /api/student/stats (own records only). */
export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const firstName = user?.name?.split(' ')[0] || 'Student';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get('/student/stats');
        if (!cancelled) setStats(data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading dashboard..." />
      </div>
    );
  }
  if (error) return <EmptyState title="Could not load stats" description={error} />;

  const o = stats?.overall || { present: 0, absent: 0, total: 0, percentage: 0 };
  const hasData = o.total > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Welcome back, {firstName} 👋</h2>
          <p className="text-sm text-slate-500">
            {stats?.profile?.rollNumber && (
              <span className="font-medium text-slate-700">{stats.profile.rollNumber}</span>
            )}
            {stats?.profile?.className && <> · {stats.profile.className}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadPdf} loading={pdfLoading}>
            <FileDown size={16} /> PDF report
          </Button>
          <Link to="/student/attendance">
            <Button>
              <CalendarCheck size={16} /> View my attendance
            </Button>
          </Link>
        </div>
      </div>

      {/* ---- shortage warning ---- */}
      {stats?.shortage && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Attendance shortage warning</p>
            <p>
              Your overall attendance is <strong>{o.percentage}%</strong> which is below the minimum
              requirement of <strong>{stats.threshold}%</strong>. Attend classes regularly to get back
              on track.
            </p>
          </div>
        </div>
      )}

      {!hasData ? (
        <EmptyState
          title="No attendance recorded yet"
          description="Your attendance appears here after your teachers start marking classes."
        />
      ) : (
        <>
          {/* ---- KPI cards ---- */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Percent}
              label="Overall Attendance"
              value={`${o.percentage}%`}
              accent={
                o.percentage >= (stats.threshold || 75)
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-rose-600 bg-rose-50'
              }
              hint={`Minimum ${stats.threshold}% required`}
            />
            <StatCard icon={CheckCircle2} label="Total Present" value={o.present} accent="text-emerald-600 bg-emerald-50" hint={`${o.late} late · ${o.leave} on leave`} />
            <StatCard icon={XCircle} label="Total Absent" value={o.absent} accent="text-rose-600 bg-rose-50" hint="Classes you missed" />
            <StatCard icon={Layers} label="Total Classes" value={o.total} hint="Conducted in your subjects" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ---- subject-wise ---- */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-900">Subject-wise attendance</h3>
                <span className="text-xs text-slate-400">present / conducted</span>
              </div>
              {!stats.subjectWise?.length ? (
                <EmptyState title="No subject data yet" description="Subject percentages appear after your first marked class." />
              ) : (
                <ul className="space-y-4">
                  {stats.subjectWise.map((sub) => (
                    <li key={sub.subjectId}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {sub.name} <span className="text-xs text-slate-400">({sub.code})</span>
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            sub.percentage >= 75 ? 'text-emerald-600' : sub.percentage >= 50 ? 'text-amber-600' : 'text-rose-600'
                          }`}
                        >
                          {sub.percentage}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            sub.percentage >= 75 ? 'bg-emerald-500' : sub.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${sub.percentage}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {sub.present} present of {sub.total} classes
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* ---- recent records ---- */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-900">Recent records</h3>
                <Link to="/student/attendance" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
                  View all →
                </Link>
              </div>
              {!stats.recent?.length ? (
                <EmptyState title="Nothing yet" description="Your latest attendance records appear here." />
              ) : (
                <ul className="divide-y divide-slate-50">
                  {stats.recent.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{r.subjectName}</p>
                        <p className="text-xs text-slate-400">
                          {dateFmt(r.date)} · {r.className}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_META[r.status]?.color}`}>
                        {STATUS_META[r.status]?.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
