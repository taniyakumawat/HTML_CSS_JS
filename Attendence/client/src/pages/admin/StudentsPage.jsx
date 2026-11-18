import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2, RotateCcw } from 'lucide-react';
import apiClient from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import useResource from '../../hooks/useResource.js';
import DataTable, { RowButton } from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { currentAcademicYear } from './resources.jsx';

const EMPTY = {
  name: '',
  email: '',
  rollNumber: '',
  password: '',
  phone: '',
  gender: '',
  department: '',
  course: '',
  semester: '',
  class: '',
  academicYear: currentAcademicYear(),
  address: '',
};

const StatusBadge = ({ active }) => (
  <span
    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
    }`}
  >
    {active ? 'Active' : 'Inactive'}
  </span>
);

/**
 * Students management - creates BOTH a login (User) and a Student profile.
 * Cascading dropdowns: department -> course -> semester -> class.
 */
export default function StudentsPage() {
  const { items, loading, error, meta, search, setSearch, setFilter, setPage, reload } =
    useResource('/admin/students', { sort: '-createdAt' });
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Quick search from the topbar lands here as ?search=...
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [refs, setRefs] = useState({ departments: [], courses: [], semesters: [], classes: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reference lists for dropdowns
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
        load('departments', '/admin/departments?limit=100&sort=name'),
        load('courses', '/admin/courses?limit=100&sort=name'),
        load('semesters', '/admin/semesters?limit=100&sort=name'),
        load('classes', '/admin/classes?limit=100&sort=name'),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const courses = refs.courses.filter((c) => !form.department || c.department === form.department);
  const semesters = refs.semesters.filter((s) => !form.course || s.course === form.course);
  const classes = refs.classes.filter(
    (c) =>
      (!form.course || c.course === form.course) &&
      (!form.semester || c.semester === form.semester)
  );

  const setField = (name, value) =>
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'department') {
        next.course = '';
        next.semester = '';
        next.class = '';
      }
      if (name === 'course') {
        next.semester = '';
        next.class = '';
      }
      if (name === 'semester') next.class = '';
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
      department: row.department?._id || row.department || '',
      course: row.course?._id || row.course || '',
      semester: row.semester?._id || row.semester || '',
      class: row.class?._id || row.class || '',
      password: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ['name', 'email', 'rollNumber', 'department', 'course', 'semester', 'class'];
    if (!editing) required.push('password');
    const missing = required.filter((k) => !String(form[k] || '').trim());
    if (missing.length) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!editing && form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password; // keep current password
      if (editing) {
        await apiClient.put(`/admin/students/${editing._id}`, payload);
        toast.success('Student updated');
      } else {
        await apiClient.post('/admin/students', payload);
        toast.success('Student created');
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
      await apiClient.delete(`/admin/students/${deleting._id}`);
      toast.success('Student deactivated');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (row) => {
    try {
      await apiClient.post(`/admin/students/${row._id}/restore`);
      toast.success('Student reactivated');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restore failed');
    }
  };

  const columns = [
    {
      key: 'rollNumber',
      label: 'Roll No.',
      render: (r) => <span className="font-semibold text-navy-900">{r.rollNumber}</span>,
    },
    {
      key: 'name',
      label: 'Student',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white">
            {r.name?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{r.name}</p>
            <p className="truncate text-xs text-slate-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'class', label: 'Class', render: (r) => r.class?.name || '—' },
    { key: 'course', label: 'Course', render: (r) => r.course?.code || '—' },
    { key: 'semester', label: 'Semester', render: (r) => r.semester?.name || '—' },
    { key: 'isActive', label: 'Status', render: (r) => <StatusBadge active={r.isActive} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        subtitle="Add, edit and manage student accounts & profiles"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Student
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
        searchPlaceholder="Search name, roll number or email..."
        meta={meta}
        onPageChange={setPage}
        emptyTitle="No students found"
        emptyDescription="Add your first student using the button above."
        toolbar={
          <>
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-600 focus:border-purple-400 focus:outline-none"
              defaultValue=""
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-600 focus:border-purple-400 focus:outline-none"
              defaultValue=""
              onChange={(e) => setFilter('class', e.target.value)}
            >
              <option value="">All classes</option>
              {refs.classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        }
        rowActions={(row) => (
          <>
            <RowButton icon={Pencil} label="Edit" onClick={() => openEdit(row)} />
            {row.isActive ? (
              <RowButton icon={Trash2} label="Deactivate" tone="danger" onClick={() => setDeleting(row)} />
            ) : (
              <RowButton icon={RotateCcw} label="Reactivate" tone="success" onClick={() => handleRestore(row)} />
            )}
          </>
        )}
      />

      {/* Create / edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Student' : 'Add Student'}
        subtitle={editing ? `Editing ${editing.rollNumber}` : 'Creates a login account and student profile'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? 'Save changes' : 'Create Student'}
            </Button>
          </>
        }
      >
        {formError && (
          <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name *</label>
            <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Student name" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="student@college.edu" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Roll number *</label>
            <input className="input" value={form.rollNumber} onChange={(e) => setField('rollNumber', e.target.value)} placeholder="e.g. BCA001" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {editing ? 'New password (optional)' : 'Password *'}
            </label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Department *</label>
            <select className="input" value={form.department} onChange={(e) => setField('department', e.target.value)}>
              <option value="">Select department</option>
              {refs.departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Course *</label>
            <select className="input" value={form.course} disabled={!form.department} onChange={(e) => setField('course', e.target.value)}>
              <option value="">{form.department ? 'Select course' : 'Select department first'}</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Semester *</label>
            <select className="input" value={form.semester} disabled={!form.course} onChange={(e) => setField('semester', e.target.value)}>
              <option value="">{form.course ? 'Select semester' : 'Select course first'}</option>
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Class *</label>
            <select className="input" value={form.class} disabled={!form.semester} onChange={(e) => setField('class', e.target.value)}>
              <option value="">{form.semester ? 'Select class' : 'Select semester first'}</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Academic year *</label>
            <input className="input" value={form.academicYear} onChange={(e) => setField('academicYear', e.target.value)} placeholder="2026-2027" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
            <textarea rows={2} className="input resize-y" value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Optional" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Deactivate student?"
        message={`${deleting?.name || ''} (${deleting?.rollNumber || ''}) will no longer be able to log in. Attendance history is preserved and you can reactivate anytime.`}
        confirmLabel="Deactivate"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
