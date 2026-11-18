import { ApiError } from '../middleware/error.js';
import Class from '../models/Class.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';

/** ObjectId (or populated doc) -> plain string id. */
export const idOf = (v) => String(v?._id || v || '');

/**
 * Resolve the Teacher profile of the logged-in user.
 * Throws 403 if the caller is not an active teacher.
 */
export const resolveTeacher = async (req) => {
  if (req.user.role !== 'teacher') {
    throw new ApiError(403, 'A teacher account is required for this action.');
  }
  const teacher = req.user.teacher
    ? await Teacher.findById(req.user.teacher)
    : await Teacher.findOne({ user: req.user.id });
  if (!teacher || !teacher.isActive) {
    throw new ApiError(403, 'Teacher profile not found or inactive.');
  }
  return teacher;
};

/**
 * Resolve the Student profile of the logged-in user.
 * Throws 403 if the caller is not an active student.
 * Students can ONLY ever reach their own profile - no id comes from the client.
 */
export const resolveStudent = async (req) => {
  if (req.user.role !== 'student') {
    throw new ApiError(403, 'A student account is required for this action.');
  }
  const student = req.user.student
    ? await Student.findById(req.user.student)
    : await Student.findOne({ user: req.user.id });
  if (!student || !student.isActive) {
    throw new ApiError(403, 'Student profile not found or inactive.');
  }
  return student;
};

/** True if the teacher is the class teacher or assigned to any subject of the class. */
export const isAssignedToClass = (cls, teacherId) => {
  const tid = idOf(teacherId);
  return (
    idOf(cls.classTeacher) === tid ||
    (cls.teachingAssignments || []).some((a) => idOf(a.teacher) === tid)
  );
};

/**
 * Load a class and assert the caller may access it.
 * - admin: always allowed
 * - teacher: only if assigned (classTeacher or teachingAssignments)
 * Throws 404 (missing) or 403 (not assigned).
 */
export const assertClassAccess = async (req, classId, teacher = null) => {
  const cls = await Class.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');
  if (req.user.role === 'admin') return cls;
  const t = teacher || (await resolveTeacher(req));
  if (!isAssignedToClass(cls, t._id)) {
    throw new ApiError(403, 'You are not assigned to this class.');
  }
  return cls;
};

/**
 * Authorization for marking/correcting attendance (strict model):
 * - admin: always allowed
 * - teachingAssignments is THE source of truth: the (subject, teacher) pair
 *   must exist on the class
 * - only when a class has NO assignments at all may its classTeacher mark
 * Throws 403 otherwise.
 */
export const assertSubjectTeachingRight = (cls, teacherId, subjectId, role) => {
  if (role === 'admin') return;
  const tid = idOf(teacherId);
  const sid = idOf(subjectId);
  const assignments = cls.teachingAssignments || [];

  const pairAssigned = assignments.some(
    (a) => idOf(a.subject) === sid && idOf(a.teacher) === tid
  );
  if (pairAssigned) return;

  if (assignments.length === 0 && idOf(cls.classTeacher) === tid) return;

  if (!isAssignedToClass(cls, tid)) {
    throw new ApiError(403, 'You are not assigned to this class.');
  }
  throw new ApiError(403, 'You are not assigned to teach this subject in this class.');
};

/** Normalize any date input to start-of-day so the unique index matches exactly. */
export const normalizeDate = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};
