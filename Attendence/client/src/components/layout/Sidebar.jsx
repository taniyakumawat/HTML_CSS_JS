import { NavLink } from 'react-router-dom';
import { GraduationCap, X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABEL } from '../../utils/constants.js';

/**
 * Dark navy sidebar with navigation.
 * Items without a `path` are shown as "coming soon" (enabled in later phases).
 * Props:
 *  - items: [{ label, path?, icon, disabled? }]
 *  - onClose: optional, called by the mobile close button
 */
export default function Sidebar({ items = [], onClose }) {
  const { user, logout } = useAuth();
  const initial = (user?.name || 'G').charAt(0).toUpperCase();
  const roleLabel = user ? ROLE_LABEL[user.role] || user.role : 'Guest';
  return (
    <aside className="flex h-full w-64 flex-col bg-navy-950 text-slate-300">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-900/40">
            <GraduationCap size={20} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Smart Attendance</p>
            <p className="text-[11px] text-slate-400">College Management</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const disabled = item.disabled || !item.path;

            if (disabled) {
              return (
                <li key={item.label}>
                  <span className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 opacity-70">
                    {Icon && <Icon size={18} className="shrink-0" />}
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                      soon
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <NavLink
                  to={item.path}
                  end={item.path.split('/').length <= 2}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {Icon && <Icon size={18} className="shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Signed-in user + logout */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{user?.name || 'Guest User'}</p>
            <p className="truncate text-[11px] text-slate-400">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
