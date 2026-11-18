import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import apiClient from '../api/client.js';
import Card from './ui/Card.jsx';
import Spinner from './ui/Spinner.jsx';
import EmptyState from './ui/EmptyState.jsx';
import PageHeader from './ui/PageHeader.jsx';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const TODAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
  new Date().getDay()
];

/**
 * Weekly timetable grouped by day.
 * endpoint must return { items: [{ day, periodNumber, startTime, endTime,
 *   subject, class, teacher?, room }] }
 */
export default function TimetableView({ endpoint, title, subtitle, teacherColumn = false }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(endpoint)
      .then(({ data }) => {
        if (!cancelled) setSlots(data.data.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load timetable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading timetable..." />
      </div>
    );
  }

  const byDay = DAYS.map((d) => ({ day: d, slots: slots.filter((s) => s.day === d) })).filter(
    (g) => g.slots.length > 0
  );

  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} />

      {error ? (
        <EmptyState title="Could not load timetable" description={error} />
      ) : !byDay.length ? (
        <EmptyState
          icon={CalendarDays}
          title="No timetable yet"
          description="Scheduled periods appear here once the admin creates them."
        />
      ) : (
        <div className="space-y-4">
          {byDay.map((group) => (
            <Card key={group.day}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-900">{cap(group.day)}</h3>
                {group.day === TODAY && (
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                    Today
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 font-semibold">Period</th>
                      <th className="px-3 py-2 font-semibold">Time</th>
                      <th className="px-3 py-2 font-semibold">Subject</th>
                      <th className="px-3 py-2 font-semibold">Class</th>
                      {teacherColumn && <th className="px-3 py-2 font-semibold">Teacher</th>}
                      <th className="px-3 py-2 font-semibold">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.slots.map((s) => (
                      <tr key={s._id} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-2.5 font-bold text-navy-900">{s.periodNumber}</td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {s.startTime} – {s.endTime}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800">{s.subject?.name || '—'}</p>
                          <p className="text-xs text-slate-400">{s.subject?.code}</p>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">
                          {s.class?.name || '—'}
                        </td>
                        {teacherColumn && (
                          <td className="px-3 py-2.5 text-slate-600">{s.teacher?.name || '—'}</td>
                        )}
                        <td className="px-3 py-2.5 text-slate-500">{s.room || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
