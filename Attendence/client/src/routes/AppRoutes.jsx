import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Login from '../pages/Login.jsx';
import ForgotPassword from '../pages/ForgotPassword.jsx';
import NotFound from '../pages/NotFound.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import StudentsPage from '../pages/admin/StudentsPage.jsx';
import TeachersPage from '../pages/admin/TeachersPage.jsx';
import TimetablePage from '../pages/admin/TimetablePage.jsx';
import ResourcePage from '../components/admin/ResourcePage.jsx';
import {
  departmentConfig,
  courseConfig,
  semesterConfig,
  subjectConfig,
  classConfig,
} from '../pages/admin/resources.jsx';
import TeacherDashboard from '../pages/teacher/TeacherDashboard.jsx';
import MarkAttendancePage from '../pages/teacher/MarkAttendancePage.jsx';
import MyClassesPage from '../pages/teacher/MyClassesPage.jsx';
import TeacherTimetablePage from '../pages/teacher/TeacherTimetablePage.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import MyAttendancePage from '../pages/student/MyAttendancePage.jsx';
import StudentTimetablePage from '../pages/student/StudentTimetablePage.jsx';
import ReportsPage from '../pages/ReportsPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { ADMIN_NAV, TEACHER_NAV, STUDENT_NAV, ROLES, ROLE_HOME } from '../utils/constants.js';

/** "/" -> role dashboard (or login) */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
}

/**
 * Application routes (Phase 3: real authentication + role guards).
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Admin area - Phase 4 */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<DashboardLayout navItems={ADMIN_NAV} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<StudentsPage />} />
          <Route path="/admin/teachers" element={<TeachersPage />} />
          <Route path="/admin/departments" element={<ResourcePage config={departmentConfig} />} />
          <Route path="/admin/courses" element={<ResourcePage config={courseConfig} />} />
          <Route path="/admin/semesters" element={<ResourcePage config={semesterConfig} />} />
          <Route path="/admin/subjects" element={<ResourcePage config={subjectConfig} />} />
          <Route path="/admin/classes" element={<ResourcePage config={classConfig} />} />
          <Route path="/admin/timetable" element={<TimetablePage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Teacher area - Phase 5 */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]} />}>
        <Route element={<DashboardLayout navItems={TEACHER_NAV} />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/mark" element={<MarkAttendancePage />} />
          <Route path="/teacher/classes" element={<MyClassesPage />} />
          <Route path="/teacher/timetable" element={<TeacherTimetablePage />} />
          <Route
            path="/teacher/reports"
            element={
              <ReportsPage
                title="My Reports"
                subtitle="Attendance reports for your assigned classes - download as PDF or Excel."
              />
            }
          />
        </Route>
      </Route>

      {/* Student area - Phase 6 (read-only: never mark/edit attendance) */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
        <Route element={<DashboardLayout navItems={STUDENT_NAV} />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<MyAttendancePage />} />
          <Route path="/student/timetable" element={<StudentTimetablePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
