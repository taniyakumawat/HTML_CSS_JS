import {
  LayoutDashboard,
  Users,
  UserRound,
  BookOpen,
  CalendarDays,
  BarChart3,
  Settings,
  ClipboardCheck,
  CalendarCheck,
  FileText,
  Inbox,
  Building2,
  Layers,
  School,
} from 'lucide-react';

// ---------- Roles ----------
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

// Where each role lands after login / on "/"
export const ROLE_HOME = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
};

export const ROLE_LABEL = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
};

// ---------- Attendance statuses ----------
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  LEAVE: 'leave',
};

export const STATUS_META = {
  present: { label: 'Present', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  absent: { label: 'Absent', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  late: { label: 'Late', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  leave: { label: 'Leave', color: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
};

/** Ordered options for status <select> dropdowns. */
export const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'leave', label: 'Leave' },
];

// ---------- Minimum attendance threshold ----------
export const DEFAULT_ATTENDANCE_THRESHOLD = 75;

// ---------- Sidebar navigation (items marked soon arrive in later phases) ----------
const soon = true;

export const ADMIN_NAV = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Students', path: '/admin/students', icon: Users },
  { label: 'Teachers', path: '/admin/teachers', icon: UserRound },
  { label: 'Departments', path: '/admin/departments', icon: Building2 },
  { label: 'Courses', path: '/admin/courses', icon: BookOpen },
  { label: 'Semesters', path: '/admin/semesters', icon: Layers },
  { label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
  { label: 'Classes', path: '/admin/classes', icon: School },
  { label: 'Timetable', path: '/admin/timetable', icon: CalendarDays },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings, disabled: soon },
];

export const TEACHER_NAV = [
  { label: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
  { label: 'Mark Attendance', path: '/teacher/mark', icon: ClipboardCheck },
  { label: 'My Classes', path: '/teacher/classes', icon: Users },
  { label: 'Timetable', path: '/teacher/timetable', icon: CalendarDays },
  { label: 'Reports', path: '/teacher/reports', icon: FileText },
];

export const STUDENT_NAV = [
  { label: 'Dashboard', path: '/student', icon: LayoutDashboard },
  { label: 'My Attendance', path: '/student/attendance', icon: CalendarCheck },
  { label: 'Timetable', path: '/student/timetable', icon: CalendarDays },
  { label: 'Leave Requests', icon: Inbox, disabled: soon },
  { label: 'Reports', icon: FileText, disabled: soon },
];
