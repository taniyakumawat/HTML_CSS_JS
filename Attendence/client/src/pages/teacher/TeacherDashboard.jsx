import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  BookOpen,
  Users,
  CheckCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '../../components/ui/Card.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Button from '../../components/ui/Button.jsx';
import apiClient from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const dateFmt = (v) =>
  new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

/** Teacher dashboard - live data from GET /api/teacher/stats. */
export default function TeacherDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Teacher';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get('/teacher/stats');
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

  const s = stats || {};
  const unmarked = Math.max(0, (s.todayClasses?.length || 0) - (s.todayMarked || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Welcome back, {firstName} 👋</h2>
          <p className="text-sm text-slate-500">Your classes, subjects and attendance at a glance.</p>
        </div>
        <Link to="/teacher/mark">
          <Button>
            <CheckCheck size={16} /> Mark Attendance
          </Button>
        </Link>
      </div>

      {/* ---- KPI cards ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Today's Classes"
          value={s.todayClasses?.length || 0}
          hint={unmarked > 0 ? `${unmarked} not marked yet` : s.todayClasses?.length ? 'All marked today 🎉' : 'No classes scheduled'}
        />
        <StatCard icon={BookOpen} label="Assigned Subjects" value={s.assignedSubjects?.length || 0} hint={`${s.classCount || 0} class(es)`} />
        <StatCard icon={Users} label="Total Students" value={s.totalStudents || 0} accent="text-indigo-600 bg-indigo-50" hint="Across my classes" />
        <StatCard
          icon={CheckCheck}
          label="Classes Conducted"
          value={s.conducted || 0}
          accent="text-emerald-600 bg-emerald-50"
          hint="Sessions I have marked"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- Today's timetable ---- */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Today's classes</h3>
            <Link to="/teacher/timetable" className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700">
              Full timetable <ArrowRight size={13} />
            </Link>
          </div>
          {!s.todayClasses?.length ? (
            <EmptyState title="No classes today" description="Your scheduled periods for today appear here." />
          ) : (
            <ul className="space-y-2.5">
              {s.todayClasses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {c.className} <span className="font-normal text-slate-400">·</span> {c.subjectName}
                    </p>
                    <p className="text-xs text-slate-400">
                      Period {c.periodNumber} · {c.startTime} – {c.endTime}
                    </p>
                  </div>
                  <Link to={`/teacher/mark`}>
                    <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-purple-600 shadow-sm ring-1 ring-slate-200 hover:bg-purple-50">
                      Mark
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---- Subject-wise percentage ---- */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Subject-wise attendance</h3>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <TrendingUp size={13} /> present / conducted
            </span>
          </div>
          {!s.subjectWise?.length ? (
            <EmptyState title="No data yet" description="Subject-wise percentages appear after you mark attendance." />
          ) : (
            <ul className="space-y-4">
              {s.subjectWise.map((sub) => (
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
                    {sub.present} present of {sub.total} conducted
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ---- Recent records ---- */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-900">Recent attendance records</h3>
          <Link to="/teacher/mark" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
            Mark new →
          </Link>
        </div>
        {!s.recent?.length ? (
          <EmptyState title="Nothing marked yet" description="Your recently marked sessions will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Class</th>
                  <th className="px-3 py-2.5 font-semibold">Subject</th>
                  <th className="px-3 py-2.5 font-semibold">Present</th>
                  <th className="px-3 py-2.5 font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {s.recent.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2.5 text-slate-600">{dateFmt(r.date)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{r.className}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.subjectName}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {r.present}/{r.total}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.percentage >= 75
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.percentage >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {r.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
