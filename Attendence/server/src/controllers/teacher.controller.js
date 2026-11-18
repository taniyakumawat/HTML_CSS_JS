import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paged } from '../utils/pagination.js';
import { resolveTeacher, assertClassAccess, idOf, normalizeDate } from '../utils/classAccess.js';
import Class from '../models/Class.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import Timetable, { DAYS_OF_WEEK } from '../models/Timetable.js';
import Attendance from '../models/Attendance.js';

const CLASS_POPULATE = [
  { path: 'course', select: 'name code' },
  { path: 'semester', select: 'name number' },
  { path: 'classTeacher', select: 'name employeeId' },
  { path: 'teachingAssignments.subject', select: 'name code' },
];

/** Classes assigned to this teacher (as class teacher or subject teacher). */
const myClassesQuery = (teacherId) => ({
  $or: [{ classTeacher: teacherId }, { 'teachingAssignments.teacher': teacherId }],
});

export const teacherController = {
  /** GET /api/teacher/classes - my classes with student count + my subjects. */
  getMyClasses: async (req, res, next) => {
    try {
      const teacher = await resolveTeacher(req);
      const classes = await Class.find(myClassesQuery(teacher._id))
        .sort({ name: 1 })
        .populate([
          ...CLASS_POPULATE,
          { path: 'teachingAssignments.teacher', select: 'name employeeId' },
        ]);
      const counts = await Promise.all(
        classes.map((c) => Student.countDocuments({ class: c._id, isActive: true }))
      );

      const items = [];
      for (let i = 0; i < classes.length; i += 1) {
        const c = classes[i];
        // subjects *I* may mark in this class (strict pair rule)
        let mySubjects = (c.teachingAssignments || [])
          .filter((a) => idOf(a.teacher) === idOf(teacher._id))
          .map((a) => a.subject);
        if (
          !mySubjects.length &&
          (c.teachingAssignments || []).length === 0 &&
          idOf(c.classTeacher) === idOf(teacher._id)
        ) {
          // unassigned class: its class teacher may mark any course subject
          mySubjects = await Subject.find({ course: c.course })
            .select('name code')
            .sort({ name: 1 });
        }
        items.push({ ...c.toObject(), studentCount: counts[i], mySubjects });
      }
      sendSuccess(res, { items, total: items.length });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/teacher/classes/:id/students - roster of ONE of my classes.
   * 403 if the class is not assigned to this teacher.
   */
  getClassStudents: async (req, res, next) => {
    try {
      await assertClassAccess(req, req.params.id);
      const students = await Student.find({ class: req.params.id, isActive: true })
        .sort({ rollNumber: 1 })
        .select('name rollNumber email gender');
      sendSuccess(res, { items: students, total: students.length });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/teacher/subjects - subjects assigned to me across my classes. */
  getMySubjects: async (req, res, next) => {
    try {
      const teacher = await resolveTeacher(req);
      const classes = await Class.find(myClassesQuery(teacher._id)).select(
        'name teachingAssignments'
      );
      // only pairs where THIS teacher is the subject teacher
      const subjectIds = [
        ...new Set(
          classes.flatMap((c) =>
            (c.teachingAssignments || [])
              .filter((a) => idOf(a.teacher) === idOf(teacher._id))
              .map((a) => idOf(a.subject))
          )
        ),
      ];
      const subjects = await Subject.find({ _id: { $in: subjectIds } })
        .populate([
          { path: 'course', select: 'name code' },
          { path: 'semester', select: 'name number' },
        ])
        .sort({ name: 1 });
      sendSuccess(res, { items: subjects, total: subjects.length });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/teacher/timetable - my weekly schedule (day order, then period). */
  getMyTimetable: async (req, res, next) => {
    try {
      const teacher = await resolveTeacher(req);
      const slots = await Timetable.find({ teacher: teacher._id }).populate([
        { path: 'class', select: 'name section' },
        { path: 'subject', select: 'name code' },
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
   * GET /api/teacher/stats - dashboard data:
   * today's classes, assigned subjects, total students, classes conducted,
   * recent records, subject-wise attendance percentage.
   */
  getMyStats: async (req, res, next) => {
    try {
      const teacher = await resolveTeacher(req);
      const classes = await Class.find(myClassesQuery(teacher._id))
        .sort({ name: 1 })
        .populate(CLASS_POPULATE);
      const classIds = classes.map((c) => c._id);

      const today = normalizeDate(new Date());
      const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
        new Date().getDay()
      ];

      const [totalStudents, conducted, todayMarked, recentDocs, subjectAgg] = await Promise.all([
        Student.countDocuments({ class: { $in: classIds }, isActive: true }),
        Attendance.countDocuments({ teacher: teacher._id }),
        Attendance.countDocuments({ teacher: teacher._id, date: today }),
        Attendance.find({ teacher: teacher._id })
          .sort({ date: -1, createdAt: -1 })
          .limit(6)
          .populate([
            { path: 'class', select: 'name' },
            { path: 'subject', select: 'name code' },
          ]),
        Attendance.aggregate([
          { $match: { teacher: teacher._id } },
          { $unwind: '$records' },
          { $group: { _id: { subject: '$subject', status: '$records.status' }, count: { $sum: 1 } } },
        ]),
      ]);

      // ---- subject-wise percentage (present / conducted x 100) ----
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
          percentage: v.total ? Math.round((v.present / v.total) * 100) : 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // ---- assigned subjects (pairs where I am the subject teacher) ----
      const assignedMap = {};
      for (const c of classes) {
        for (const a of c.teachingAssignments || []) {
          if (idOf(a.teacher) !== idOf(teacher._id)) continue;
          const key = idOf(a.subject);
          if (!assignedMap[key]) assignedMap[key] = { _id: key, name: a.subject?.name, code: a.subject?.code, classes: [] };
          assignedMap[key].classes.push(c.name);
        }
      }

      // ---- today's timetable slots ----
      const todaySlots = await Timetable.find({ teacher: teacher._id, day: weekday })
        .sort({ periodNumber: 1 })
        .populate([
          { path: 'class', select: 'name' },
          { path: 'subject', select: 'name code' },
        ]);

      const recent = recentDocs.map((doc) => {
        const present = doc.records.filter((r) => r.status === 'present').length;
        return {
          id: doc._id,
          date: doc.date,
          className: doc.class?.name || '—',
          subjectName: doc.subject?.name || '—',
          present,
          total: doc.records.length,
          percentage: doc.records.length
            ? Math.round((present / doc.records.length) * 100)
            : 0,
        };
      });

      sendSuccess(res, {
        todayClasses: todaySlots.map((s) => ({
          id: s._id,
          periodNumber: s.periodNumber,
          startTime: s.startTime,
          endTime: s.endTime,
          className: s.class?.name || '—',
          subjectName: s.subject?.name || '—',
        })),
        todayMarked,
        assignedSubjects: Object.values(assignedMap),
        totalStudents,
        conducted,
        recent,
        subjectWise,
        classCount: classes.length,
      });
    } catch (error) {
      next(error);
    }
  },
};
