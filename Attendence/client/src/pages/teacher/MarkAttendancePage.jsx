import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCheck, Pencil, Save, X, CalendarCheck2, ShieldAlert } from 'lucide-react';
import apiClient from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { STATUS_META } from '../../utils/constants.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

const STATUSES = ['present', 'absent', 'late', 'leave'];

const CHIP = {
  present: { active: 'border-emerald-600 bg-emerald-600 text-white', idle: 'bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-600' },
  absent: { active: 'border-rose-600 bg-rose-600 text-white', idle: 'bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600' },
  late: { active: 'border-amber-500 bg-amber-500 text-white', idle: 'bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600' },
  leave: { active: 'border-sky-500 bg-sky-500 text-white', idle: 'bg-white text-slate-500 hover:border-sky-300 hover:text-sky-600' },
};

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * ★ Core Phase 5 screen: pick class + subject + date → full roster →
 * one-click "mark all present" or individual chips → save.
 * Already marked? It loads the session and requires a reason to correct.
 */
export default function MarkAttendancePage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(searchParams.get('class') || '');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(localToday());

  const [roster, setRoster] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [session, setSession] = useState(null); // existing Attendance doc or null
  const [loadingSession, setLoadingSession] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ---- my classes ----
  useEffect(() => {
    apiClient
      .get('/teacher/classes')
      .then(({ data }) => setClasses(data.data.items))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load classes'));
  }, []);

  const selectedClass = useMemo(
    () => classes.find((c) => c._id === classId),
    [classes, classId]
  );
  const subjectOptions = selectedClass?.mySubjects || [];

  // ---- roster for the class ----
  useEffect(() => {
    if (!classId) {
      setRoster([]);
      setStatuses({});
      return;
    }
    let cancelled = false;
    setLoadingRoster(true);
    setError('');
    setSession(null);
    setEditing(false);
    setReason('');
    apiClient
      .get(`/teacher/classes/${classId}/students`)
      .then(({ data }) => {
        if (cancelled) return;
        const items = data.data.items;
        setRoster(items);
        setStatuses(Object.fromEntries(items.map((s) => [s._id, 'present'])));
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load students');
      })
      .finally(() => {
        if (!cancelled) setLoadingRoster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  // ---- existing session for class + subject + date ----
  useEffect(() => {
    if (!classId || !subjectId || !date) {
      setSession(null);
      setEditing(false);
      return;
    }
    let cancelled = false;
    setLoadingSession(true);
    (async () => {
      try {
        const { data } = await apiClient.get(
          `/attendance/session?class=${classId}&subject=${subjectId}&date=${date}`
        );
        if (cancelled) return;
        const existing = data.data;
        setSession(existing);
        setEditing(false);
        setReason('');
        if (existing) {
          setStatuses(
            Object.fromEntries(existing.records.map((r) => [r.student._id, r.status]))
          );
        }
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, subjectId, date]);

  // ---- derived ----
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 };
    roster.forEach((s) => {
      const st = statuses[s._id];
      if (c[st] !== undefined) c[st] += 1;
    });
    return c;
  }, [roster, statuses]);

  const setStatus = (studentId, status) =>
    setStatuses((prev) => ({ ...prev, [studentId]: status }));

  const markAllPresent = () =>
    setStatuses(Object.fromEntries(roster.map((s) => [s._id, 'present'])));

  const cancelEdit = () => {
    if (session) {
      setStatuses(Object.fromEntries(session.records.map((r) => [r.student._id, r.status])));
    }
    setEditing(false);
    setReason('');
    setError('');
  };

  // ---- save ----
  const save = async () => {
    setError('');
    if (!roster.length || !classId || !subjectId || !date) return;
    if (session && editing && !reason.trim()) {
      setError('Please provide a reason for the correction (kept in the audit history).');
      return;
    }
    setSaving(true);
    const records = roster.map((s) => ({ student: s._id, status: statuses[s._id] || 'present' }));
    try {
      if (!session) {
        const { data } = await apiClient.post('/attendance', {
          class: classId,
          subject: subjectId,
          date,
          records,
        });
        setSession(data.data);
        toast.success('Attendance marked successfully');
      } else {
        const { data } = await apiClient.put(`/attendance/${session._id}`, {
          records,
          reason: reason.trim(),
        });
        setSession(data.data);
        setEditing(false);
        setReason('');
        toast.success(data.message || 'Attendance corrected');
      }
    } catch (err) {
      const d = err.response?.data;
      setError(d?.errors?.map((e) => e.message).join(' ') || d?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- render ----
  if (!classes.length && !error) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading your classes..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mark Attendance"
        subtitle="Select class, subject and date — then mark every student"
      />

      {!classes.length ? (
        <EmptyState
          title="No classes assigned to you"
          description="Ask the admin to assign you to classes and subjects (Classes → Teaching assignments)."
        />
      ) : (
        <>
          {/* ---- selectors ---- */}
          <Card>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Class *</label>
                <select
                  className="input"
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setSubjectId('');
                  }}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject *</label>
                <select
                  className="input"
                  value={subjectId}
                  disabled={!classId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">
                    {!classId ? 'Select class first' : subjectOptions.length ? 'Select subject' : 'No subjects assigned'}
                  </option>
                  {subjectOptions.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date *</label>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            {selectedClass && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
                  {selectedClass.course?.name}
                </span>
                <span className="rounded-full bg-purple-50 px-2.5 py-1 font-semibold text-purple-700">
                  {selectedClass.semester?.name}
                </span>
                <span>{selectedClass.studentCount} student(s) on roster</span>
              </p>
            )}
          </Card>

          {classId && subjectOptions.length === 0 && !loadingRoster && (
            <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <ShieldAlert size={16} /> No subjects are assigned to you in this class. Contact the
              admin to add teaching assignments.
            </p>
          )}

          {/* ---- roster ---- */}
          {loadingRoster ? (
            <div className="flex justify-center py-16">
              <Spinner label="Loading students..." />
            </div>
          ) : !classId || !subjectId ? (
            <EmptyState
              icon={CalendarCheck2}
              title="Pick a class and subject"
              description="The complete student list appears here once both are selected."
            />
          ) : roster.length === 0 ? (
            <EmptyState title="No active students" description="This class has no students yet." />
          ) : (
            <Card>
              {/* status banner */}
              {session && !editing && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCheck size={16} />
                    Already marked on {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil size={14} /> Correct attendance
                  </Button>
                </div>
              )}
              {session && editing && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-700">
                    Correcting attendance — every change is recorded in the audit history.
                  </p>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X size={14} /> Cancel correction
                  </Button>
                </div>
              )}

              {/* summary + mark all */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((st) => (
                    <span
                      key={st}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_META[st].color}`}
                    >
                      {counts[st]} {STATUS_META[st].label}
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="secondary" onClick={markAllPresent}>
                  <CheckCheck size={14} /> Mark all present
                </Button>
              </div>

              {error && (
                <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
              )}

              {/* student rows */}
              <div className="divide-y divide-slate-50 overflow-hidden rounded-xl border border-slate-200">
                {roster.map((s) => (
                  <div
                    key={s._id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/70"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white">
                        {s.name?.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.rollNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatus(s._id, st)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            statuses[s._id] === st ? CHIP[st].active : CHIP[st].idle
                          }`}
                        >
                          {STATUS_META[st].label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* reason (edit mode only) */}
              {session && editing && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Reason for correction *
                  </label>
                  <input
                    className="input"
                    value={reason}
                    maxLength={500}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Student was marked wrongly - joined 5 minutes late"
                  />
                </div>
              )}

              {/* save */}
              <div className="mt-5 flex justify-end">
                {!session ? (
                  <Button onClick={save} loading={saving}>
                    <Save size={16} /> Save attendance
                  </Button>
                ) : !editing ? (
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil size={16} /> Correct attendance
                  </Button>
                ) : (
                  <Button onClick={save} loading={saving}>
                    <Save size={16} /> Save correction
                  </Button>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
