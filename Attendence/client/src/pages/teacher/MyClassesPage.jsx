import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Users, BookOpen, GraduationCap } from 'lucide-react';
import apiClient from '../../api/client.js';
import Card from '../../components/ui/Card.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

/** My classes - only the classes assigned to this teacher (server-scoped). */
export default function MyClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/teacher/classes')
      .then(({ data }) => setClasses(data.data.items))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading classes..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-navy-900">My Classes</h2>
        <p className="text-sm text-slate-500">Classes and subjects assigned to you</p>
      </div>

      {error ? (
        <EmptyState title="Could not load classes" description={error} />
      ) : !classes.length ? (
        <EmptyState
          title="No classes assigned yet"
          description="The admin will assign you to classes and subjects — they show up here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <Card key={c._id} className="flex flex-col">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-navy-900">{c.name}</h3>
                  <p className="text-xs text-slate-400">
                    Section {c.section || '—'} · {c.academicYear}
                  </p>
                </div>
                <span className="rounded-lg bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">
                  {c.course?.code}
                </span>
              </div>

              <div className="mb-4 space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <GraduationCap size={15} className="text-slate-400" /> {c.semester?.name}
                </p>
                <p className="flex items-center gap-2">
                  <Users size={15} className="text-slate-400" /> {c.studentCount} student(s)
                </p>
                <p className="flex items-center gap-2">
                  <BookOpen size={15} className="text-slate-400" /> {c.classTeacher?.name || 'No class teacher'}
                </p>
              </div>

              {c.mySubjects?.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {c.mySubjects.map((s) => (
                    <span
                      key={s._id}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto">
                <Link to={`/teacher/mark?class=${c._id}`} className="block">
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700">
                    <CheckCheck size={16} /> Mark attendance
                  </button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
