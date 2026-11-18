import mongoose from 'mongoose';
import { ApiError } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paged } from '../utils/pagination.js';
import { resolveStudent } from '../utils/classAccess.js';
import {
  DEFAULT_ATTENDANCE_THRESHOLD,
  attendancePercentage,
} from '../utils/constants.js';
import Attendance from '../models/Attendance.js';
import Subject from '../models/Subject.js';
import Timetable, { DAYS_OF_WEEK } from '../models/Timetable.js';
import { renderTablePdf } from '../services/pdf.js';
import { REPORT_COLUMNS } from '../services/report.columns.js';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The student's own record inside an attendance document (others stay hidden). */
const ownRecord = (doc, studentId) =>
  doc.records.find((r) => String(r.student) === String(studentId));

/** Shared aggregation unwind of ONLY this student's records. */
const ownRecordsUnwind = (studentId) => [
  { $match: { 'records.student': studentId } },
  {
    $project: {
      date: 1,
      subject: 1,
      class: 1,
      own: {
        $filter: {
          input: '$records',
          as: 'r',
          cond: { $eq: ['$$r.student', studentId] },
        },
      },
    },
  },
  { $unwind: '$own' },
];

export const studentController = {
  /**
   * GET /api/student/stats - personal dashboard:
   * overall %, status totals, subject-wise %, shortage warning, recent records.
   */
  getMyStats: async (req, res, next) => {
    try {
      const student = await resolveStudent(req);
      await student.populate({ path: 'class', select: 'name' });
      const sid = student._id;
      const pipeline = ownRecordsUnwind(sid);

      const [totalsAgg, subjectAgg, recentDocs] = await Promise.all([
        Attendance.aggregate([...pipeline, { $group: { _id: '$own.status', count: { $sum: 1 } } }]),
        Attendance.aggregate([
          ...pipeline,
          {
            $group: {
              _id: { subject: '$subject', status: '$own.status' },
              count: { $sum: 1 },
            },
          },
        ]),
        Attendance.find({ 'records.student': sid })
          .sort({ date: -1, createdAt: -1 })
          .limit(6)
          .populate([
            { path: 'subject', select: 'name code' },
            { path: 'class', select: 'name' },
          ]),
      ]);

      const byStatus = Object.fromEntries(totalsAgg.map((g) => [g._id, g.count]));
      const overall = {
        present: byStatus.present || 0,
        absent: byStatus.absent || 0,
        late: byStatus.late || 0,
        leave: byStatus.leave || 0,
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      };
      overall.percentage = attendancePercentage(overall.present, overall.total);

      // subject-wise
      const bySubject = {};
      for (const row of subjectAgg) {
        const key = String(row._id.subject);
        bySubject[key] = bySubject[key] || { present: 0, total: 0 };
        bySubject[key].total += row.count;
        if (row._id.status === 'present') bySubject[key].present += row.count;
      }
      const subjectDocs = await Subject.find({ _id: { $in: Object.keys(bySubject) } }).select(
        'name code'
      );
      const subjectMap = Object.fromEntries(subjectDocs.map((s) => [String(s._id), s]));
      const subjectWise = Object.entries(bySubject)
        .map(([id, v]) => ({
          subjectId: id,
          name: subjectMap[id]?.name || '—',
          code: subjectMap[id]?.code || '',
          present: v.present,
          total: v.total,
          percentage: attendancePercentage(v.present, v.total),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const recent = recentDocs
        .map((doc) => {
          const own = ownRecord(doc, sid);
          if (!own) return null;
          return {
            id: doc._id,
            date: doc.date,
            status: own.status,
            subjectName: doc.subject?.name || '—',
            className: doc.class?.name || '—',
          };
        })
        .filter(Boolean);

      const threshold = DEFAULT_ATTENDANCE_THRESHOLD;
      sendSuccess(res, {
        overall,
        subjectWise,
        recent,
        threshold,
        shortage: overall.total > 0 && overall.percentage < threshold,
        profile: {
          rollNumber: student.rollNumber,
          className: student.class?.name || null,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/student/attendance - personal history (paginated).
   * Filters: ?subject= ?status= ?month=YYYY-MM
   * Only THIS student's records are ever returned.
   */
  getMyAttendance: async (req, res, next) => {
    try {
      const student = await resolveStudent(req);
      const sid = student._id;
      const { page, limit, skip, sort } = getPagination(req);

      const filter = {};
      // $elemMatch keeps student+status on the SAME array element -
      // plain dot notation could match another student's record in the doc.
      const own = { student: sid };
      if (req.query.status) {
        if (!['present', 'absent', 'late', 'leave'].includes(req.query.status)) {
          throw new ApiError(400, 'Invalid status filter.');
        }
        own.status = req.query.status;
      }
      filter.records = { $elemMatch: own };

      if (req.query.subject) {
        if (!mongoose.isValidObjectId(req.query.subject)) {
          throw new ApiError(400, 'Invalid subject filter.');
        }
        filter.subject = req.query.subject;
      }
      if (req.query.month) {
        if (!MONTH_RE.test(req.query.month)) {
          throw new ApiError(400, 'month must look like YYYY-MM.');
        }
        const [y, m] = req.query.month.split('-').map(Number);
        filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
      }

      const [docs, total] = await Promise.all([
        Attendance.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate([
            { path: 'subject', select: 'name code' },
            { path: 'class', select: 'name' },
          ]),
        Attendance.countDocuments(filter),
      ]);

      const items = docs
        .map((doc) => {
          const own = ownRecord(doc, sid);
          if (!own) return null;
          return {
            _id: doc._id,
            date: doc.date,
            periodNumber: doc.periodNumber,
            status: own.status,
            note: own.note || '',
            subject: doc.subject,
            class: doc.class,
          };
        })
        .filter(Boolean);

      sendSuccess(res, paged(items, page, limit, total));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/student/calendar?month=YYYY-MM
   * Per-day summary of my attendance for the month (for the calendar view).
   */
  getMyCalendar: async (req, res, next) => {
    try {
      const student = await resolveStudent(req);
      const sid = student._id;
      const month = req.query.month || (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })();
      if (!MONTH_RE.test(month)) throw new ApiError(400, 'month must look like YYYY-MM.');

      const [y, m] = month.split('-').map(Number);
      const docs = await Attendance.find({
        'records.student': sid,
        date: { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) },
      })
        .select('date records subject')
        .populate({ path: 'subject', select: 'name code' });

      const days = {};
      for (const doc of docs) {
        const own = ownRecord(doc, sid);
        if (!own) continue;
        const key = `${doc.date.getFullYear()}-${String(doc.date.getMonth() + 1).padStart(2, '0')}-${String(doc.date.getDate()).padStart(2, '0')}`;
        days[key] = days[key] || { date: key, present: 0, total: 0, subjects: [] };
        days[key].total += 1;
        if (own.status === 'present') days[key].present += 1;
        days[key].subjects.push(`${doc.subject?.name || '—'}: ${own.status}`);
      }
      const dayList = Object.values(days)
        .map((d) => ({ ...d, percentage: attendancePercentage(d.present, d.total) }))
        .sort((a, b) => a.date.localeCompare(b.date));

      sendSuccess(res, { month, days: dayList });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/student/timetable - my class's weekly schedule. */
  getMyTimetable: async (req, res, next) => {
    try {
      const student = await resolveStudent(req);
      if (!student.class) return sendSuccess(res, { items: [], total: 0 });

      const slots = await Timetable.find({ class: student.class }).populate([
        { path: 'subject', select: 'name code' },
        { path: 'teacher', select: 'name employeeId' },
      ]);
      slots.sort(
        (a, b) =>
          DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day) ||
          a.periodNumber - b.periodNumber
      );
      sendSuccess(res, { items: slots, total: slots.length });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/student/report/pdf - personal attendance report download.
   * Only the caller's own records ever reach the document.
   */
  downloadMyReportPdf: async (req, res, next) => {
    try {
      const student = await resolveStudent(req);
      await student.populate([
        { path: 'class', select: 'name section' },
        { path: 'course', select: 'name code' },
      ]);

      const docs = await Attendance.find({ 'records.student': student._id })
        .sort({ date: -1, periodNumber: 1 })
        .limit(5000)
        .populate([
          { path: 'subject', select: 'name code' },
          { path: 'class', select: 'name section' },
        ]);

      const rows = [];
      const counts = { present: 0, late: 0, absent: 0, leave: 0 };
      for (const doc of docs) {
        const own = doc.records.find((r) => String(r.student) === String(student._id));
        if (!own) continue;
        if (counts[own.status] !== undefined) counts[own.status] += 1;
        rows.push({
          date: doc.date,
          periodNumber: doc.periodNumber,
          subjectName: doc.subject?.name || '—',
          className: doc.class?.name || '—',
          status: own.status,
          note: own.note || '',
        });
      }

      const total = rows.length;
      const percentage = attendancePercentage(counts.present, total);
      const shortage = total > 0 && percentage < DEFAULT_ATTENDANCE_THRESHOLD;
      const className = student.class
        ? `${student.class.name}${student.class.section ? ' - ' + student.class.section : ''}`
        : '—';

      renderTablePdf({
        res,
        title: `Attendance Report - ${student.name}`,
        subtitle: `Roll No: ${student.rollNumber}  ·  Class: ${className}  ·  ${student.course?.name || ''}`.trim(),
        metaLine: `Period: all recorded sessions  ·  Generated ${new Date().toLocaleString('en-IN')}`,
        summaryLine: total
          ? `Present ${counts.present}  ·  Late ${counts.late}  ·  Absent ${counts.absent}  ·  Leave ${counts.leave}  ·  Total ${total}  ·  Overall ${percentage}% (minimum ${DEFAULT_ATTENDANCE_THRESHOLD}%)${shortage ? '  -  SHORTAGE' : ''}`
          : 'No attendance recorded yet.',
        columns: REPORT_COLUMNS.personal,
        rows,
        filename: `my-attendance-${student.rollNumber || student._id}.pdf`,
      });
    } catch (error) {
      next(error);
    }
  },
};
