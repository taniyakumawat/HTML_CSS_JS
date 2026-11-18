import mongoose from 'mongoose';
import { ApiError } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paged } from '../utils/pagination.js';
import {
  resolveTeacher,
  assertClassAccess,
  assertSubjectTeachingRight,
  normalizeDate,
  idOf,
} from '../utils/classAccess.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import { notifyClassStudents, notifyStudents } from '../services/notification.service.js';

const POPULATE = [
  { path: 'class', select: 'name section' },
  { path: 'subject', select: 'name code' },
  { path: 'teacher', select: 'name employeeId' },
];

/** Display date for notifications: "14 Nov 2026". */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Validate incoming records against the class roster:
 * - every active student must be covered exactly once
 * - no students from other classes
 * Returns the sanitized records.
 */
const validateRecords = async (classId, records) => {
  const roster = await Student.find({ class: classId, isActive: true }).select('_id rollNumber');
  const rosterIds = new Set(roster.map((s) => String(s._id)));
  const seen = new Set();

  for (const r of records) {
    const sid = String(r.student);
    if (!rosterIds.has(sid)) {
      throw new ApiError(400, 'Records contain a student who is not on this class roster.');
    }
    if (seen.has(sid)) {
      throw new ApiError(400, 'Duplicate student in attendance records.');
    }
    seen.add(sid);
  }

  if (seen.size !== rosterIds.size) {
    const missing = rosterIds.size - seen.size;
    throw new ApiError(400, `Attendance must cover every student of the class (${missing} missing).`);
  }

  return roster.map((s) => {
    const record = records.find((r) => String(r.student) === String(s._id));
    return {
      student: s._id,
      status: record.status,
      note: record.note || '',
      markedAt: new Date(),
    };
  });
};

export const attendanceController = {
  /**
   * GET /api/attendance/session?class=&subject=&date=
   * Returns the marked session for that slot, or `data: null` when not yet marked.
   * Only the class's assigned teachers (or admin) may look.
   */
  getSession: async (req, res, next) => {
    try {
      const { class: classId, subject: subjectId, date } = req.query;
      if (!classId || !subjectId || !date) {
        throw new ApiError(400, 'class, subject and date query params are required.');
      }
      if (!mongoose.isValidObjectId(classId) || !mongoose.isValidObjectId(subjectId)) {
        throw new ApiError(400, 'Invalid class or subject.');
      }
      await assertClassAccess(req, classId);

      const session = await Attendance.findOne({
        class: classId,
        subject: subjectId,
        date: normalizeDate(date),
      })
        .populate([
          ...POPULATE,
          { path: 'records.student', select: 'name rollNumber' },
        ]);
      sendSuccess(res, session); // null = not marked yet
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/attendance/sessions - history list.
   * Teacher: only sessions of classes assigned to them (optionally ?class=).
   * Admin: everything (optionally filtered by class / subject / date range).
   */
  listSessions: async (req, res, next) => {
    try {
      const { page, limit, skip, sort } = getPagination(req);
      const filter = {};

      if (req.query.class) {
        await assertClassAccess(req, req.query.class); // teacher may only pass own class
        filter.class = req.query.class;
      }
      if (req.query.subject) filter.subject = req.query.subject;

      if (req.user.role === 'teacher') {
        const teacher = await resolveTeacher(req);
        // sessions conducted by me, in my classes
        const myClasses = await mongoose
          .model('Class')
          .find({
            $or: [{ classTeacher: teacher._id }, { 'teachingAssignments.teacher': teacher._id }],
          })
          .select('_id');
        const myIds = myClasses.map((c) => c._id);
        filter.$or = [{ teacher: teacher._id }, { class: { $in: myIds } }];
      } else if (req.query.teacher) {
        filter.teacher = req.query.teacher;
      }

      if (req.query.dateFrom || req.query.dateTo) {
        filter.date = {};
        if (req.query.dateFrom) filter.date.$gte = normalizeDate(req.query.dateFrom);
        if (req.query.dateTo) filter.date.$lte = normalizeDate(req.query.dateTo);
      }

      const [items, total] = await Promise.all([
        Attendance.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(POPULATE)
          .select('-records -auditHistory'), // list view: summary only
        Attendance.countDocuments(filter),
      ]);
      sendSuccess(res, paged(items, page, limit, total));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/attendance - mark a session (admin or assigned teacher).
   * Duplicate class+subject+date -> 409 (unique index).
   */
  markAttendance: async (req, res, next) => {
    try {
      const { class: classId, subject: subjectId, date, periodNumber, records } = req.body;

      const cls = await assertClassAccess(req, classId);
      const teacher =
        req.user.role === 'teacher' ? await resolveTeacher(req) : null;
      if (teacher) assertSubjectTeachingRight(cls, teacher._id, subjectId, req.user.role);

      // subject must belong to the class's course
      const subject = await Subject.findById(subjectId);
      if (!subject) throw new ApiError(404, 'Subject not found');
      if (idOf(subject.course) !== idOf(cls.course)) {
        throw new ApiError(400, 'This subject does not belong to the class course.');
      }

      const cleanRecords = await validateRecords(classId, records);

      await Attendance.init(); // guarantee the unique index before insert
      try {
        const session = await Attendance.create({
          class: cls._id,
          subject: subject._id,
          teacher: teacher?._id || null,
          date: normalizeDate(date),
          periodNumber: periodNumber || null,
          records: cleanRecords,
          markedBy: req.user.id,
          auditHistory: [{ action: 'created', changedBy: req.user.id, changes: [] }],
        });

        // Phase 8: tell every student of the class (fire-and-forget safe)
        await notifyClassStudents(cls._id, {
          title: 'Attendance marked',
          message: `Your attendance for ${subject.name} on ${fmtDate(date)} has been marked by ${
            req.user.name || 'your teacher'
          }.`,
          type: 'info',
          relatedModel: 'Attendance',
          relatedId: session._id,
        });

        const populated = await Attendance.findById(session._id).populate(POPULATE);
        sendSuccess(res, populated, 'Attendance marked successfully', 201);
      } catch (error) {
        if (error.code === 11000) {
          throw new ApiError(409, 'Attendance is already marked for this class, subject and date.');
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/attendance/:id - authorized correction with audit history.
   * A reason is required; every status change is appended to auditHistory.
   */
  updateAttendance: async (req, res, next) => {
    try {
      const session = await Attendance.findById(req.params.id);
      if (!session) throw new ApiError(404, 'Attendance session not found');

      const cls = await assertClassAccess(req, session.class);
      if (req.user.role === 'teacher') {
        const teacher = await resolveTeacher(req);
        assertSubjectTeachingRight(cls, teacher._id, session.subject, req.user.role);
      }

      const cleanRecords = await validateRecords(session.class, req.body.records);

      // ---- diff old vs new for the audit trail ----
      const oldMap = new Map(session.records.map((r) => [String(r.student), r.status]));
      const changes = [];
      for (const rec of cleanRecords) {
        const from = oldMap.get(String(rec.student));
        if (from && from !== rec.status) {
          changes.push({ student: rec.student, from, to: rec.status });
        }
      }

      if (changes.length === 0) {
        return sendSuccess(res, session, 'No changes detected');
      }

      session.records = cleanRecords;
      session.auditHistory.push({
        action: 'corrected',
        changedBy: req.user.id,
        changedAt: new Date(),
        reason: req.body.reason,
        changes,
      });
      await session.save();

      // Phase 8: notify ONLY the students whose status changed (per-student text)
      const subjectDoc = await Subject.findById(session.subject).select('name');
      const changeByStudent = new Map(changes.map((c) => [String(c.student), c]));
      await notifyStudents(
        changes.map((c) => c.student),
        (studentId) => {
          const c = changeByStudent.get(studentId);
          return {
            title: 'Attendance corrected',
            message: `Your attendance for ${subjectDoc?.name || 'class'} on ${fmtDate(
              session.date
            )} was corrected: ${c.from} -> ${c.to}. Reason: ${req.body.reason}`,
            type: 'warning',
            relatedModel: 'Attendance',
            relatedId: session._id,
          };
        }
      );

      const populated = await Attendance.findById(session._id).populate(POPULATE);
      sendSuccess(
        res,
        populated,
        `Attendance corrected - ${changes.length} record(s) updated with audit history`
      );
    } catch (error) {
      next(error);
    }
  },
};
