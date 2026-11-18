import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, RotateCcw } from 'lucide-react';
import apiClient from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import useResource from '../../hooks/useResource.js';
import DataTable, { RowButton } from '../ui/DataTable.jsx';
import PageHeader from '../ui/PageHeader.jsx';
import Button from '../ui/Button.jsx';
import Modal, { ConfirmDialog } from '../ui/Modal.jsx';

/**
 * Config-driven CRUD page.
 * Given { endpoint, title, singular, fields, columns, initialValues }
 * it provides: searchable table + pagination + create/edit modal +
 * delete confirmation + toasts + dependent dropdowns.
 *
 * Field types: text | email | password | number | date | time
 *              | textarea | select (static options)
 *              | ref      (fetched list; supports dependsOn for cascades)
 *              | custom   ({ Component }) - receives { form, setForm, refData }
 */
export default function ResourcePage({ config }) {
  const {
    endpoint,
    title,
    subtitle,
    singular = 'Record',
    columns,
    fields,
    searchPlaceholder = 'Search...',
    initialValues = {},
    idKey = '_id',
    titleKey = 'name',
    transformSubmit,
    transformToForm,
  } = config;

  const { items, loading, error, meta, search, setSearch, setPage, reload } = useResource(endpoint, {
    sort: config.sort,
  });
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refData, setRefData] = useState({});

  // ---- Fetch dropdown sources once ----
  const refEndpoints = useMemo(
    () => [...new Set(fields.filter((f) => f.type === 'ref').map((f) => f.ref))],
    [fields]
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const ep of refEndpoints) {
        try {
          const { data } = await apiClient.get(`${ep}?limit=100&sort=name`);
          if (!cancelled) setRefData((r) => ({ ...r, [ep]: data.data.items }));
        } catch {
          /* ignore - dropdown stays empty */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refEndpoints]);

  // ---- Modal helpers ----
  const openCreate = () => {
    setEditing(null);
    setForm({ ...initialValues });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const initial = { ...initialValues, ...row };
    // auto-map populated refs -> ids and dates -> yyyy-mm-dd
    fields
      .filter((f) => f.type === 'ref')
      .forEach((f) => {
        initial[f.name] = row[f.name]?._id || row[f.name] || '';
      });
    fields
      .filter((f) => f.type === 'date' && row[f.name])
      .forEach((f) => {
        initial[f.name] = new Date(row[f.name]).toISOString().slice(0, 10);
      });
    if (transformToForm) Object.assign(initial, transformToForm(row));
    setEditing(row);
    setForm(initial);
    setFormError('');
    setModalOpen(true);
  };

  const setField = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // clear cascade children when a parent changes
      fields
        .filter((f) => f.dependsOn === name)
        .forEach((dep) => {
          next[dep.name] = '';
        });
      return next;
    });
  };

  // ---- Submit / delete ----
  const buildPayload = () => {
    const out = {};
    for (const f of fields) {
      if (f.type === 'custom') {
        out[f.name] = form[f.name] ?? [];
        continue;
      }
      const raw = form[f.name];
      const value = raw === undefined || raw === null ? '' : raw;
      if (f.type === 'ref') {
        out[f.name] = value === '' ? null : value; // null clears optional refs on edit
      } else if (f.type === 'number') {
        if (value !== '') out[f.name] = Number(value);
      } else if (f.type === 'date') {
        out[f.name] = value === '' ? null : value;
      } else {
        out[f.name] = value;
      }
    }
    return transformSubmit ? transformSubmit(out) : out;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = fields
      .filter((f) => f.required && f.type !== 'custom' && !String(form[f.name] ?? '').trim())
      .map((f) => f.label);
    if (missing.length) {
      setFormError(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = buildPayload();
      if (editing) {
        await apiClient.put(`${endpoint}/${editing[idKey]}`, payload);
        toast.success(`${singular} updated`);
      } else {
        await apiClient.post(endpoint, payload);
        toast.success(`${singular} created`);
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
      await apiClient.delete(`${endpoint}/${deleting[idKey]}`);
      toast.success(`${singular} deleted`);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- Field rendering ----
  const optionsFor = (field) => {
    const all = refData[field.ref] || [];
    if (field.dependsOn) {
      const parent = form[field.dependsOn];
      if (!parent) return [];
      return all.filter((o) => String(o[field.dependsOnKey || field.dependsOn]) === String(parent));
    }
    return all;
  };

  const renderField = (field) => {
    if (field.type === 'custom') {
      return <field.Component key={field.name} form={form} setForm={setForm} refData={refData} />;
    }

    const inputProps = { id: field.name, ...(field.props || {}) };
    const value = form[field.name] ?? '';
    const change = (e) => setField(field.name, e.target.value);

    let control;
    if (field.type === 'textarea') {
      control = (
        <textarea rows={3} className="input resize-y" value={value} onChange={change} {...inputProps} />
      );
    } else if (field.type === 'select') {
      control = (
        <select className="input" value={value} onChange={change} {...inputProps}>
          <option value="">{field.placeholder ?? 'Select...'}</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    } else if (field.type === 'ref') {
      const opts = optionsFor(field);
      const waiting = Boolean(field.dependsOn) && !form[field.dependsOn];
      control = (
        <select className="input" value={value} onChange={change} disabled={waiting} {...inputProps}>
          <option value="">
            {waiting ? `Select ${field.parentLabel || 'the parent field'} first` : field.placeholder ?? 'Select...'}
          </option>
          {opts.map((o) => (
            <option key={o._id} value={o._id}>
              {field.refLabel ? field.refLabel(o) : o.name}
            </option>
          ))}
        </select>
      );
    } else {
      control = (
        <input
          type={field.type || 'text'}
          className="input"
          value={value}
          onChange={change}
          placeholder={field.placeholder}
          {...inputProps}
        />
      );
    }

    return (
      <div key={field.name} className={field.className || ''}>
        <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="text-rose-500"> *</span>}
        </label>
        {control}
        {field.hint && <p className="mt-1 text-xs text-slate-400">{field.hint}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add {singular}
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
        searchPlaceholder={searchPlaceholder}
        meta={meta}
        onPageChange={setPage}
        emptyTitle={`No ${title.toLowerCase()} found`}
        emptyDescription="Create the first one using the button above."
        rowActions={(row) => (
          <>
            <RowButton icon={Pencil} label="Edit" onClick={() => openEdit(row)} />
            <RowButton icon={Trash2} label="Delete" tone="danger" onClick={() => setDeleting(row)} />
          </>
        )}
      />

      {/* Create / edit form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} ${singular}`}
        subtitle={editing ? `Editing “${editing[titleKey] || editing._id}”` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? 'Save changes' : `Create ${singular}`}
            </Button>
          </>
        }
      >
        {formError && (
          <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {fields.map(renderField)}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${singular}?`}
        message={`“${deleting?.[titleKey] || deleting?._id || ''}” will be permanently removed. If it is referenced by other records the system will refuse the delete.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
