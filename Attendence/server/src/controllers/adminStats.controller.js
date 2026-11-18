import { sendSuccess } from '../utils/apiResponse.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';

const DAY = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

/**
 * GET /api/admin/stats
 * Live numbers for the admin dashboard + 7-day attendance trend.
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const today = startOfToday();
    const weekStart = new Date(today.getTime() - 6 * DAY);

    const [
      students,
      activeStudents,
      teachers,
      classes,
      subjects,
      departments,
      courses,
      todayDocs,
      overallAgg,
      trendAgg,
      recentDocs,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Teacher.countDocuments({ isActive: true }),
      Class.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Course.countDocuments({ isActive: true }),
      Attendance.find({ date: { $gte: today } }),
      Attendance.aggregate([
        { $unwind: '$records' },
        { $group: { _id: '$records.status', count: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: weekStart } } },
        { $unwind: '$records' },
        { $group: { _id: { date: '$date', status: '$records.status' }, count: { $sum: 1 } } },
      ]),
      Attendance.find()
        .sort({ date: -1, createdAt: -1 })
        .limit(6)
        .populate([
          { path: 'class', select: 'name' },
          { path: 'subject', select: 'name code' },
        ]),
    ]);

    // ---- Today ----
    const todayStats = { sessions: todayDocs.length, present: 0, absent: 0, late: 0, leave: 0 };
    for (const doc of todayDocs) {
      for (const record of doc.records) {
        if (todayStats[record.status] !== undefined) todayStats[record.status] += 1;
      }
    }
    todayStats.total = todayStats.present + todayStats.absent + todayStats.late + todayStats.leave;
    todayStats.percentage = pct(todayStats.present, todayStats.total);

    // ---- Overall (formula: present / conducted x 100) ----
    const byStatus = Object.fromEntries(overallAgg.map((g) => [g._id, g.count]));
    const overallTotal = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const overall = {
      total: overallTotal,
      present: byStatus.present || 0,
      absent: byStatus.absent || 0,
      late: byStatus.late || 0,
      leave: byStatus.leave || 0,
      percentage: pct(byStatus.present || 0, overallTotal),
    };

    // ---- 7 day trend ----
    const trendMap = {};
    for (const row of trendAgg) {
      const key = new Date(row._id.date).toISOString().slice(0, 10);
      trendMap[key] = trendMap[key] || { present: 0, total: 0 };
      trendMap[key].total += row.count;
      if (row._id.status === 'present') trendMap[key].present += row.count;
    }
    const trend = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(weekStart.getTime() + i * DAY);
      const key = date.toISOString().slice(0, 10);
      const entry = trendMap[key] || { present: 0, total: 0 };
      trend.push({
        date: key,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        present: entry.present,
        total: entry.total,
        percentage: pct(entry.present, entry.total),
      });
    }

    // ---- Recent sessions ----
    const recent = recentDocs.map((doc) => {
      const present = doc.records.filter((r) => r.status === 'present').length;
      return {
        id: doc._id,
        date: doc.date,
        className: doc.class?.name || '—',
        subjectName: doc.subject?.name || '—',
        present,
        total: doc.records.length,
        percentage: pct(present, doc.records.length),
      };
    });

    sendSuccess(res, {
      totals: {
        students,
        activeStudents,
        teachers,
        classes,
        subjects,
        departments,
        courses,
      },
      today: todayStats,
      overall,
      trend,
      recent,
    });
  } catch (error) {
    next(error);
  }
};
