import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, RotateCcw } from 'lucide-react';
import apiClient from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import useResource from '../../hooks/useResource.js';
import DataTable, { RowButton } from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ConfirmDialog } from '../../components/ui/Modal.jsx';

const EMPTY = {
  name: '',
  email: '',
  employeeId: '',
  password: '',
  phone: '',
  department: '',
  qualification: '',
  subjectsText: '',
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

/** Teachers management - creates BOTH a login (User) and a Teacher profile. */
export default function TeachersPage() {
  const { items, loading, error, meta, search, setSearch, setFilter, setPage, reload } =
    useResource('/admin/teachers', { sort: '-createdAt' });
  const toast = useToast();

  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get('/admin/departments?limit=100&sort=name')
      .then(({ data }) => setDepartments(data.data.items))
      .catch(() => {});
  }, []);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...EMPTY,
      ...row,
      department: row.department?._id || row.department || '',
      subjectsText: (row.subjects || []).join(', '),
      password: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ['name', 'email', 'employeeId', 'department'];
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
      const { subjectsText, ...rest } = form;
      const payload = {
        ...rest,
        subjects: subjectsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (editing && !payload.password) delete payload.password;
      if (editing) {
        await apiClient.put(`/admin/teachers/${editing._id}`, payload);
        toast.success('Teacher updated');
      } else {
        await apiClient.post('/admin/teachers', payload);
        toast.success('Teacher created');
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
      await apiClient.delete(`/admin/teachers/${deleting._id}`);
      toast.success('Teacher deactivated');
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
      await apiClient.post(`/admin/teachers/${row._id}/restore`);
      toast.success('Teacher reactivated');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restore failed');
    }
  };

  const columns = [
    {
      key: 'employeeId',
      label: 'Employee ID',
      render: (r) => <span className="font-semibold text-navy-900">{r.employeeId}</span>,
    },
    {
      key: 'name',
      label: 'Teacher',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
            {r.name?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{r.name}</p>
            <p className="truncate text-xs text-slate-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'department', label: 'Department', render: (r) => r.department?.name || '—' },
    { key: 'qualification', label: 'Qualification', render: (r) => r.qualification || '—' },
    {
      key: 'subjects',
      label: 'Expertise',
      render: (r) =>
        r.subjects?.length ? (
          <span className="text-xs text-slate-500">{r.subjects.slice(0, 3).join(', ')}</span>
        ) : (
          '—'
        ),
    },
    { key: 'isActive', label: 'Status', render: (r) => <StatusBadge active={r.isActive} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teachers"
        subtitle="Add, edit and manage teacher accounts & profiles"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Teacher
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
        searchPlaceholder="Search name, employee ID or email..."
        meta={meta}
        onPageChange={setPage}
        emptyTitle="No teachers found"
        emptyDescription="Add your first teacher using the button above."
        toolbar={
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-600 focus:border-purple-400 focus:outline-none"
            defaultValue=""
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Teacher' : 'Add Teacher'}
        subtitle={editing ? `Editing ${editing.employeeId}` : 'Creates a login account and teacher profile'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? 'Save changes' : 'Create Teacher'}
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
            <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Teacher name" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="teacher@college.edu" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Employee ID *</label>
            <input className="input" value={form.employeeId} onChange={(e) => setField('employeeId', e.target.value)} placeholder="e.g. TCH001" />
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Department *</label>
            <select className="input" value={form.department} onChange={(e) => setField('department', e.target.value)}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Qualification</label>
            <input className="input" value={form.qualification} onChange={(e) => setField('qualification', e.target.value)} placeholder="e.g. M.Sc, MCA" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Subjects expertise</label>
            <input
              className="input"
              value={form.subjectsText}
              onChange={(e) => setField('subjectsText', e.target.value)}
              placeholder="DBMS, OS, Java (comma separated)"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Deactivate teacher?"
        message={`${deleting?.name || ''} (${deleting?.employeeId || ''}) will no longer be able to log in. Their teaching assignments are preserved and you can reactivate anytime.`}
        confirmLabel="Deactivate"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
