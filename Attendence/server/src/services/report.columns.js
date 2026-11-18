/**
 * Shared report column definitions for PDF + Excel exports.
 * `width` = % of the A4 content width (PDF); Excel width derived from it.
 *
 * Row shapes (see report.service.js):
 *   sessions: { date, periodNumber, className, subjectName, teacherName,
 *               present, late, absent, leave, total, percentage }
 *   students: { rollNumber, name, className, present, late, absent, leave,
 *               total, percentage }
 *   subjects: { name, code, sessions, present, late, absent, leave, total, percentage }
 *   classes:  { name, code, sessions, present, late, absent, leave, total, percentage }
 */

const fmtDate = (v) =>
  new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const num = (v) => String(v ?? 0);
const pct = (row) => `${row.percentage}%`;
const period = (row) => (row.periodNumber ? `#${row.periodNumber}` : '—');

export const REPORT_COLUMNS = {
  sessions: [
    { header: 'Date', key: 'date', width: 11, excelWidth: 14, accessor: fmtDate, dateCol: true },
    { header: 'Period', key: 'periodNumber', width: 6, excelWidth: 8, align: 'center', accessor: period },
    { header: 'Class', key: 'className', width: 15, excelWidth: 18 },
    { header: 'Subject', key: 'subjectName', width: 15, excelWidth: 22 },
    { header: 'Teacher', key: 'teacherName', width: 12, excelWidth: 20 },
    { header: 'Pres', key: 'present', width: 8, excelWidth: 7, align: 'center', accessor: (r) => num(r.present) },
    { header: 'Late', key: 'late', width: 6, excelWidth: 6, align: 'center', accessor: (r) => num(r.late) },
    { header: 'Abs', key: 'absent', width: 8, excelWidth: 6, align: 'center', accessor: (r) => num(r.absent) },
    { header: 'Leave', key: 'leave', width: 6, excelWidth: 7, align: 'center', accessor: (r) => num(r.leave) },
    { header: 'Total', key: 'total', width: 6, excelWidth: 7, align: 'center', accessor: (r) => num(r.total) },
    { header: '%', key: 'percentage', width: 7, excelWidth: 7, align: 'center', percent: true, accessor: pct },
  ],
  students: [
    { header: 'Roll No', key: 'rollNumber', width: 10, excelWidth: 12 },
    { header: 'Name', key: 'name', width: 24, excelWidth: 26 },
    { header: 'Class', key: 'className', width: 15, excelWidth: 18 },
    { header: 'Pres', key: 'present', width: 9, excelWidth: 7, align: 'center', accessor: (r) => num(r.present) },
    { header: 'Late', key: 'late', width: 8, excelWidth: 6, align: 'center', accessor: (r) => num(r.late) },
    { header: 'Abs', key: 'absent', width: 9, excelWidth: 6, align: 'center', accessor: (r) => num(r.absent) },
    { header: 'Leave', key: 'leave', width: 8, excelWidth: 7, align: 'center', accessor: (r) => num(r.leave) },
    { header: 'Total', key: 'total', width: 8, excelWidth: 7, align: 'center', accessor: (r) => num(r.total) },
    { header: '%', key: 'percentage', width: 9, excelWidth: 8, align: 'center', percent: true, accessor: pct },
  ],
  subjects: [
    { header: 'Subject', key: 'name', width: 26, excelWidth: 28 },
    { header: 'Code', key: 'code', width: 12, excelWidth: 12 },
    { header: 'Sessions', key: 'sessions', width: 10, excelWidth: 9, align: 'center', accessor: (r) => num(r.sessions) },
    { header: 'Pres', key: 'present', width: 10, excelWidth: 7, align: 'center', accessor: (r) => num(r.present) },
    { header: 'Late', key: 'late', width: 8, excelWidth: 6, align: 'center', accessor: (r) => num(r.late) },
    { header: 'Abs', key: 'absent', width: 9, excelWidth: 6, align: 'center', accessor: (r) => num(r.absent) },
    { header: 'Leave', key: 'leave', width: 8, excelWidth: 7, align: 'center', accessor: (r) => num(r.leave) },
    { header: 'Records', key: 'total', width: 10, excelWidth: 8, align: 'center', accessor: (r) => num(r.total) },
    { header: '%', key: 'percentage', width: 7, excelWidth: 8, align: 'center', percent: true, accessor: pct },
  ],
  classes: [
    { header: 'Class', key: 'name', width: 30, excelWidth: 30 },
    { header: 'Sessions', key: 'sessions', width: 12, excelWidth: 10, align: 'center', accessor: (r) => num(r.sessions) },
    { header: 'Pres', key: 'present', width: 11, excelWidth: 7, align: 'center', accessor: (r) => num(r.present) },
    { header: 'Late', key: 'late', width: 9, excelWidth: 6, align: 'center', accessor: (r) => num(r.late) },
    { header: 'Abs', key: 'absent', width: 10, excelWidth: 6, align: 'center', accessor: (r) => num(r.absent) },
    { header: 'Leave', key: 'leave', width: 9, excelWidth: 7, align: 'center', accessor: (r) => num(r.leave) },
    { header: 'Records', key: 'total', width: 11, excelWidth: 8, align: 'center', accessor: (r) => num(r.total) },
    { header: '%', key: 'percentage', width: 8, excelWidth: 8, align: 'center', percent: true, accessor: pct },
  ],
  // student's personal report (own records only)
  personal: [
    { header: 'Date', key: 'date', width: 22, excelWidth: 16, accessor: fmtDate, dateCol: true },
    { header: 'Period', key: 'periodNumber', width: 10, excelWidth: 8, align: 'center', accessor: period },
    { header: 'Subject', key: 'subjectName', width: 28, excelWidth: 26 },
    { header: 'Class', key: 'className', width: 20, excelWidth: 20 },
    { header: 'Status', key: 'status', width: 12, excelWidth: 10, align: 'center' },
    { header: 'Note', key: 'note', width: 8, excelWidth: 24 },
  ],
};

export const REPORT_LABEL = {
  sessions: 'Daily Sessions Report',
  students: 'Student-wise Report',
  subjects: 'Subject-wise Report',
  classes: 'Class-wise Report',
  personal: 'My Attendance Report',
};
