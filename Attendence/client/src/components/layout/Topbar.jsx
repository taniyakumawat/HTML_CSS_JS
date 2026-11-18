import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import ProfileMenu from './ProfileMenu.jsx';

/**
 * Top navigation bar: mobile menu, page title, quick search (jumps to the
 * role's directory with ?search=), notification bell, profile section.
 * Props: title, onMenuClick (opens mobile drawer)
 */
export default function Topbar({ title = 'Dashboard', onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Quick search: Enter jumps to the most relevant directory for the role.
  const targets = {
    admin: '/admin/students',
    teacher: '/teacher/reports',
  };

  const submitSearch = (e) => {
    if (e.key !== 'Enter') return;
    const q = query.trim();
    const target = targets[user?.role];
    if (!q || !target) return;
    navigate(`${target}?search=${encodeURIComponent(q)}`);
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="truncate text-base font-bold text-navy-900 sm:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Quick search (Enter -> filtered directory) */}
        {user?.role !== 'student' && (
          <div className="relative hidden md:block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={submitSearch}
              placeholder={
                user?.role === 'teacher' ? 'Search classes, subjects... (Enter)' : 'Search students... (Enter)'
              }
              aria-label="Quick search"
              className="h-9 w-52 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 xl:w-72"
            />
          </div>
        )}

        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
