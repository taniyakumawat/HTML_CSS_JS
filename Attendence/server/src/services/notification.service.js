import Notification from '../models/Notification.js';
import Student from '../models/Student.js';

/**
 * Notification helpers (Phase 8).
 * Failures are logged and swallowed: a notification problem must never
 * break attendance marking. All functions resolve to the count created.
 */

const logSkipped = (err) => console.error('notification skipped:', err.message);

const insertForUsers = async (userIds, payload) => {
  if (!userIds.length) return 0;
  const docs = userIds.map((uid) => ({ recipient: uid, ...payload }));
  const created = await Notification.insertMany(docs);
  return created.length;
};

/**
 * Notify every active student of a class.
 * @param classId  class _id
 * @param payload  { title, message, type?, relatedModel?, relatedId? }
 */
export const notifyClassStudents = async (classId, payload) => {
  try {
    const students = await Student.find({ class: classId, isActive: true }).select('user');
    const userIds = students.map((s) => s.user).filter(Boolean);
    return await insertForUsers(userIds, payload);
  } catch (error) {
    logSkipped(error);
    return 0;
  }
};

/**
 * Notify specific students (e.g. only the corrected ones).
 * @param studentIds array of Student _ids
 * @param payload    object, or (studentIdString) => payload for per-student text
 */
export const notifyStudents = async (studentIds, payload) => {
  try {
    const students = await Student.find({ _id: { $in: studentIds }, isActive: true }).select('user');
    const docs = students
      .filter((s) => s.user)
      .map((s) => ({
        recipient: s.user,
        ...(typeof payload === 'function' ? payload(String(s._id)) : payload),
      }));
    if (!docs.length) return 0;
    const created = await Notification.insertMany(docs);
    return created.length;
  } catch (error) {
    logSkipped(error);
    return 0;
  }
};
