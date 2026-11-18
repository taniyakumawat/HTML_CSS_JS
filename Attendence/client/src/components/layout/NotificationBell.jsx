import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import apiClient from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const TYPE_META = {
  info: { icon: Info, cls: 'bg-sky-100 text-sky-600' },
  success: { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-600' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-100 text-amber-600' },
  error: { icon: XCircle, cls: 'bg-rose-100 text-rose-600' },
};

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/**
 * Topbar bell: unread badge, dropdown list, mark one/all read.
 * Polls every 30s so the badge stays fresh while the panel is closed.
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/notifications', { params: { limit: 12 } });
      setItems(data.data.items);
      setUnread(data.data.unreadCount);
    } catch {
      /* keep last known state on transient errors */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await apiClient.put(`/notifications/${id}/read`);
    } catch {
      load();
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await apiClient.put('/notifications/read-all');
    } catch {
      load();
    }
  };

  const onItemClick = (n) => {
    markRead(n._id);
    setOpen(false);
    if (user?.role === 'student') navigate('/student/attendance');
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-bold text-navy-900">
                Notifications{' '}
                {unread > 0 && <span className="font-semibold text-purple-600">({unread} new)</span>}
              </p>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 text-xs font-semibold text-purple-600 transition hover:text-purple-800"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <p className="px-4 py-8 text-center text-sm text-slate-400">Loading...</p>
              )}
              {!loading && items.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Bell size={26} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">You're all caught up</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Attendance updates will appear here.
                  </p>
                </div>
              )}
              {!loading &&
                items.map((n) => {
                  const meta = TYPE_META[n.type] || TYPE_META.info;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={n._id}
                      onClick={() => onItemClick(n)}
                      className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 ${
                        n.isRead ? '' : 'bg-purple-50/60'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.cls}`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-slate-400">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
