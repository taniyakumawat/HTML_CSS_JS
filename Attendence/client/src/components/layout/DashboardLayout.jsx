import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const TITLES = {
  '/admin': 'Admin Dashboard',
  '/admin/students': 'Students',
  '/admin/teachers': 'Teachers',
  '/admin/departments': 'Departments',
  '/admin/courses': 'Courses',
  '/admin/semesters': 'Semesters',
  '/admin/subjects': 'Subjects',
  '/admin/classes': 'Classes',
  '/admin/timetable': 'Timetable',
  '/admin/reports': 'Reports & Analytics',
  '/teacher': 'Teacher Dashboard',
  '/teacher/mark': 'Mark Attendance',
  '/teacher/classes': 'My Classes',
  '/teacher/timetable': 'My Timetable',
  '/teacher/reports': 'My Reports',
  '/student': 'Student Dashboard',
  '/student/attendance': 'My Attendance',
  '/student/timetable': 'Class Timetable',
};

/**
 * App shell: fixed sidebar (desktop), slide-over drawer (mobile), topbar, content.
 * Props: navItems - navigation list for the current role (from constants.js)
 */
export default function DashboardLayout({ navItems = [] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar items={navItems} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            <Sidebar items={navItems} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
