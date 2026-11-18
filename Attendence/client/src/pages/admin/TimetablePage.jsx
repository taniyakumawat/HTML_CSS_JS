import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import apiClient from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import useResource from '../../hooks/useResource.js';
import DataTable, { RowButton } from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { currentAcademicYear } from './resources.jsx';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const EMPTY = {
  class: '',
  day: 'monday',
  periodNumber: '1',
  startTime: '09:00',
  endTime: '10:00',
  subject: '',
  teacher: '',
  room: '',
  academicYear: currentAcademicYear(),
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

/** Timetable management: weekly slots per class, with double-booking prevented by the API. */
export default function TimetablePage() {
  const { items, loading, error, meta, search, setSearch, setFilter, setPage, reload } =
    useResource('/admin/timetable', { sort: 'day,periodNumber' });
  const toast = useToast();

  const [refs, setRefs] = useState({ classes: [], subjects: [], teachers: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const load = async (key, url) => {
        try {
          const { data } = await apiClient.get(url);
          if (!cancelled) setRefs((r) => ({ ...r, [key]: data.data.items }));
        } catch {
          /* ignore */
        }
      };
      await Promise.all([
        load('classes', '/admin/classes?limit=100&sort=name'),
        load('subjects', '/admin/subjects?limit=200&sort=name'),
        load('teachers', '/admin/teachers?limit=100&sort=name&status=active'),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClass = refs.classes.find((c) => c._id === form.class);

  // Subjects belong to the selected class's course
  const subjectOptions = useMemo(
    () => (selectedClass ? refs.subjects.filter((s) => s.course === selectedClass.course) : []),
    [selectedClass, refs.subjects]
  );

  // Prefer teachers assigned to the class; fall back to all active teachers
  const assignedTeacherIds = useMemo(
    () =>
      selectedClass
        ? (selectedClass.teachingAssignments || []).map((a) => a.teacher?._id || a.teacher)
        : [],
    [selectedClass]
  );
  const teacherOptions = useMemo(
    () =>
      assignedTeacherIds.length
        ? refs.teachers.filter((t) => assignedTeacherIds.includes(t._id))
        : refs.teachers,
    [assignedTeacherIds, refs.teachers]
  );

  const setField = (name, value) =>
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'class') {
        next.subject = '';
        next.teacher = '';
      }
      return next;
    });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, academicYear: currentAcademicYear() });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...EMPTY,
      ...row,
      class: row.class?._id || row.class || '',
      subject: row.subject?._id || row.subject || '',
      teacher: row.teacher?._id || row.teacher || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ['class', 'day', 'periodNumber', 'startTime', 'endTime', 'subject', 'teacher'];
    const missing = required.filter((k) => !String(form[k] || '').trim());
    if (missing.length) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError('End time must be after start time.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, periodNumber: Number(form.periodNumber) };
      if (editing) {
        await apiClient.put(`/admin/timetable/${editing._id}`, payload);
        toast.success('Timetable entry updated');
      } else {
        await apiClient.post('/admin/timetable', payload);
        toast.success('Timetable entry added');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        data?.errors?.map((x) => x.message).join(' ') || data?.message || 'Save failed. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/admin/timetable/${deleting._id}`);
      toast.success('Timetable entry deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: 'day',
      label: 'Day',
      render: (r) => <span className="font-semibold text-navy-900">{cap(r.day)}</span>,
    },
    { key: 'periodNumber', label: 'Period' },
    {
      key: 'startTime',
      label: 'Time',
      render: (r) => (
        <span className="text-xs text-slate-500">
          {r.startTime} – {r.endTime}
        </span>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{r.subject?.name || '—'}</p>
          <p className="text-xs text-slate-400">{r.subject?.code}</p>
        </div>
      ),
    },
    { key: 'teacher', label: 'Teacher', render: (r) => r.teacher?.name || '—' },
    { key: 'class', label: 'Class', render: (r) => <span className="font-medium">{r.class?.name || '—'}</span> },
    { key: 'room', label: 'Room', render: (r) => r.room || '—' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable"
        subtitle="Weekly class schedule - one teacher cannot be double-booked"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Slot
          </Button>
        }
      />

      <DataTable
        columns={columns}
        items={items}
        loading={loading}
        error={error}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search room..."
        meta={meta}
        onPageChange={setPage}
        emptyTitle="No timetable entries"
        emptyDescription="Add the first weekly slot for a class."
        toolbar={
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-600 focus:border-purple-400 focus:outline-none"
            defaultValue=""
            onChange={(e) => setFilter('class', e.target.value)}
          >
            <option value="">All classes</option>
            {refs.classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        }
        rowActions={(row) => (
          <>
            <RowButton icon={Pencil} label="Edit" onClick={() => openEdit(row)} />
            <RowButton icon={Trash2} label="Delete" tone="danger" onClick={() => setDeleting(row)} />
          </>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
        subtitle="Conflicts (same class slot / same teacher slot) are rejected by the server"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? 'Save changes' : 'Add Slot'}
            </Button>
          </>
        }
      >
        {formError && (
          <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Class *</label>
            <select className="input" value={form.class} onChange={(e) => setField('class', e.target.value)}>
              <option value="">Select class</option>
              {refs.classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Day *</label>
            <select className="input" value={form.day} onChange={(e) => setField('day', e.target.value)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>{cap(d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Period *</label>
            <input
              type="number"
              min="1"
              max="15"
              className="input"
              value={form.periodNumber}
              onChange={(e) => setField('periodNumber', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Start *</label>
              <input type="time" className="input" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">End *</label>
              <input type="time" className="input" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject *</label>
            <select
              className="input"
              value={form.subject}
              disabled={!form.class}
              onChange={(e) => setField('subject', e.target.value)}
            >
              <option value="">{form.class ? 'Select subject' : 'Select class first'}</option>
              {subjectOptions.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Teacher *</label>
            <select className="input" value={form.teacher} onChange={(e) => setField('teacher', e.target.value)}>
              <option value="">
                {assignedTeacherIds.length ? 'Select teacher (assigned only)' : 'Select teacher'}
              </option>
              {teacherOptions.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Room</label>
            <input className="input" value={form.room} onChange={(e) => setField('room', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Academic year</label>
            <input className="input" value={form.academicYear} onChange={(e) => setField('academicYear', e.target.value)} placeholder="2026-2027" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete timetable entry?"
        message={`${cap(deleting?.day)} period ${deleting?.periodNumber || ''} (${deleting?.subject?.name || ''}) will be removed from the schedule.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
