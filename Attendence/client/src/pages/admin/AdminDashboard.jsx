import { useEffect, useState } from 'react';
import {
  Users,
  UserRound,
  GraduationCap,
  BookOpen,
  Building2,
  CalendarCheck,
  TrendingUp,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { StatCard } from '../../components/ui/Card.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import apiClient from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const PIE_COLORS = { present: '#10b981', absent: '#f43f5e', late: '#f59e0b', leave: '#0ea5e9' };

const dateFmt = (v) =>
  new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

/** Admin dashboard - all numbers live from GET /api/admin/stats. */
export default function AdminDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Admin';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get('/admin/stats');
        if (!cancelled) setStats(data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load dashboard stats');
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

  if (error) {
    return <EmptyState title="Could not load stats" description={error} />;
  }

  const t = stats?.totals || {};
  const today = stats?.today || {};
  const overall = stats?.overall || {};
  const trend = stats?.trend || [];
  const recent = stats?.recent || [];

  const pieData = [
    { name: 'Present', value: today.present || 0 },
    { name: 'Absent', value: today.absent || 0 },
    { name: 'Late', value: today.late || 0 },
    { name: 'Leave', value: today.leave || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Welcome back, {firstName} 👋</h2>
          <p className="text-sm text-slate-500">Here is your college overview.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Live from MongoDB
        </span>
      </div>

      {/* ---- KPI cards ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} label="Total Students" value={t.students ?? 0} hint={`${t.activeStudents ?? 0} active`} />
        <StatCard icon={UserRound} label="Total Teachers" value={t.teachers ?? 0} hint="Currently teaching" />
        <StatCard icon={GraduationCap} label="Total Classes" value={t.classes ?? 0} hint="Active sections" />
        <StatCard icon={BookOpen} label="Total Subjects" value={t.subjects ?? 0} hint={`${t.courses ?? 0} courses`} />
        <StatCard
          icon={Building2}
          label="Departments"
          value={t.departments ?? 0}
          hint="BCA · BBA · BCom..."
        />
        <StatCard
          icon={CalendarCheck}
          label="Today's Attendance"
          value={today.total ? `${today.percentage}%` : 'No sessions'}
          hint={
            today.total
              ? `${today.present} of ${today.total} marked present`
              : 'No attendance marked today'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---- 7-day trend ---- */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Attendance - last 7 days</h3>
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
              {overall.percentage ?? 0}% overall
            </span>
          </div>
          {overall.total === 0 ? (
            <EmptyState
              title="No attendance data yet"
              description="Charts will appear after teachers start marking attendance."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value, name) => [`${value}%`, 'Attendance']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fill="url(#attGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ---- Today's breakdown ---- */}
        <Card>
          <h3 className="mb-4 text-sm font-bold text-navy-900">Today's breakdown</h3>
          {pieData.length === 0 ? (
            <EmptyState
              title="Nothing marked today"
              description="Today's present / absent / late / leave split shows up here."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <TrendingUp size={14} /> Overall (present / conducted)
            </span>
            <span className="text-lg font-bold text-emerald-700">{overall.percentage ?? 0}%</span>
          </div>
        </Card>
      </div>

      {/* ---- Recent sessions ---- */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-900">Recent attendance sessions</h3>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Layers size={13} /> last {recent.length}
          </span>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Recently marked classes will be listed here."
          />
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
                {recent.map((r) => (
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
