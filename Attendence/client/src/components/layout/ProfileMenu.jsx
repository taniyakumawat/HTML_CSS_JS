import { useState } from 'react';
import { ChevronDown, KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLE_LABEL } from '../../utils/constants.js';
import apiClient from '../../api/client.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

/**
 * Topbar profile section: avatar + dropdown with account info,
 * change-password dialog and sign out.
 */
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const initial = (user?.name || 'G').charAt(0).toUpperCase();
  const roleLabel = user ? ROLE_LABEL[user.role] || user.role : 'Guest';

  const close = () => {
    setOpen(false);
    setPwOpen(false);
    setError('');
    setForm({ currentPassword: '', newPassword: '', confirm: '' });
  };

  const submitPassword = async () => {
    setError('');
    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully');
      close();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-slate-100"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[120px] truncate text-xs font-semibold text-slate-800">
            {user?.name || 'Guest'}
          </span>
          <span className="block text-[10px] text-slate-400">{roleLabel}</span>
        </span>
        <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,280px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 bg-gradient-to-br from-navy-950 to-navy-900 px-4 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user?.name || 'Guest'}</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-slate-300">
                  <Mail size={11} className="shrink-0" /> {user?.email}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
                  <ShieldCheck size={10} /> {roleLabel}
                </span>
              </div>
            </div>

            <div className="p-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  setPwOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <KeyRound size={16} className="text-slate-400" /> Change password
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={pwOpen}
        title="Change password"
        subtitle="Use at least 6 characters for the new password."
        onClose={close}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitPassword} loading={saving}>
              Update password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}
          <Input
            label="Current password"
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm new password"
            type="password"
            name="confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
