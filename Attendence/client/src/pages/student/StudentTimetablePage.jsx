import TimetableView from '../../components/TimetableView.jsx';

/** Weekly timetable of my class (from /api/student/timetable). */
export default function StudentTimetablePage() {
  return (
    <TimetableView
      endpoint="/student/timetable"
      title="Class Timetable"
      subtitle="Weekly schedule of your class"
      teacherColumn
    />
  );
}
