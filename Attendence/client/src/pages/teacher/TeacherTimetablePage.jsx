import TimetableView from '../../components/TimetableView.jsx';

/** My weekly timetable (server returns only slots where I am the teacher). */
export default function TeacherTimetablePage() {
  return (
    <TimetableView
      endpoint="/teacher/timetable"
      title="My Timetable"
      subtitle="Weekly schedule of your classes"
      teacherColumn
    />
  );
}
