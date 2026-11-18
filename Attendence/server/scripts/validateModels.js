/**
 * Offline schema validation - runs WITHOUT a database.
 * Checks that all 12 models register, required fields are enforced,
 * enums work, and critical unique indexes are defined.
 *
 * Run: npm run validate:models   (from server/)
 */
import mongoose from 'mongoose';
import {
  User,
  Student,
  Teacher,
  Department,
  Course,
  Subject,
  Semester,
  Class,
  Timetable,
  Attendance,
  LeaveRequest,
  Notification,
} from '../src/models/index.js';

const oid = () => new mongoose.Types.ObjectId();
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---------- 1. All models registered ----------
const EXPECTED = [
  'User', 'Student', 'Teacher', 'Department', 'Course', 'Subject',
  'Semester', 'Class', 'Timetable', 'Attendance', 'LeaveRequest', 'Notification',
];
const registered = mongoose.modelNames();
const missing = EXPECTED.filter((m) => !registered.includes(m));
check('All 12 models registered', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${registered.length} models`);

// ---------- 2. Required fields are enforced (invalid docs must fail) ----------
const invalidDocs = [
  ['User', new User({ email: 'no-name.com' })],
  ['Student', new Student({ name: 'No refs' })],
  ['Teacher', new Teacher({ name: 'No refs' })],
  ['Department', new Department({})],
  ['Course', new Course({ name: 'X' })],
  ['Subject', new Subject({ name: 'X' })],
  ['Semester', new Semester({ number: 1 })],
  ['Class', new Class({ name: 'X' })],
  ['Timetable', new Timetable({ day: 'monday' })],
  ['Attendance', new Attendance({ date: new Date() })],
  ['LeaveRequest', new LeaveRequest({})],
  ['Notification', new Notification({})],
];
for (const [label, doc] of invalidDocs) {
  const err = doc.validateSync();
  check(`${label}: required fields enforced`, Boolean(err), err ? '' : 'empty doc passed validation!');
}

// ---------- 3. Valid docs pass validation ----------
const deptId = oid();
const courseId = oid();
const semId = oid();
const subjId = oid();
const classId = oid();
const teacherId = oid();
const studentId = oid();
const userId = oid();
const today = new Date();
today.setHours(0, 0, 0, 0);

const validDocs = [
  ['User', new User({ name: 'Admin', email: 'admin@college.edu', password: 'secret123', role: 'admin' })],
  ['Department', new Department({ name: 'BCA', code: 'BCA' })],
  ['Course', new Course({ name: 'Bachelor of Computer Applications', code: 'BCA', department: deptId })],
  ['Semester', new Semester({ course: courseId, number: 1, year: 1, name: 'Semester 1' })],
  ['Subject', new Subject({ name: 'Data Structures', code: 'BCA-101', course: courseId, semester: semId })],
  ['Class', new Class({ name: 'BCA-1-A', course: courseId, semester: semId, section: 'A', academicYear: '2025-2026', teachingAssignments: [{ subject: subjId, teacher: teacherId }] })],
  ['Student', new Student({ user: userId, rollNumber: 'BCA001', name: 'Asha Verma', email: 'asha@college.edu', department: deptId, course: courseId, semester: semId, class: classId, academicYear: '2025-2026' })],
  ['Teacher', new Teacher({ user: userId, employeeId: 'TCH001', name: 'Ravi Kumar', email: 'ravi@college.edu', department: deptId })],
  ['Timetable', new Timetable({ class: classId, day: 'monday', periodNumber: 1, startTime: '09:00', endTime: '10:00', subject: subjId, teacher: teacherId })],
  ['Attendance', new Attendance({ class: classId, subject: subjId, teacher: teacherId, date: today, markedBy: userId, records: [{ student: studentId, status: 'present' }] })],
  ['LeaveRequest', new LeaveRequest({ student: studentId, class: classId, fromDate: today, toDate: today, reason: 'Medical appointment' })],
  ['Notification', new Notification({ recipient: userId, title: 'Attendance updated', message: 'Your attendance was updated.' })],
];
for (const [label, doc] of validDocs) {
  const err = doc.validateSync();
  check(`${label}: valid document accepted`, !err, err ? err.message : '');
}

// ---------- 4. Critical indexes ----------
const hasIndex = (model, keys, unique) =>
  model.schema.indexes().some(([def, opts]) =>
    JSON.stringify(Object.keys(def).reduce((a, k) => ({ ...a, [k]: def[k] }), {})) === JSON.stringify(Object.keys(keys).reduce((a, k) => ({ ...a, [k]: keys[k] }), {})) &&
    Boolean(opts?.unique) === unique
  );

check(
  'Attendance: unique class+subject+date (duplicate prevention)',
  hasIndex(Attendance, { class: 1, subject: 1, date: 1 }, true)
);
check(
  'Timetable: unique class+day+period',
  hasIndex(Timetable, { class: 1, day: 1, periodNumber: 1 }, true)
);
check(
  'Timetable: unique teacher+day+period (no double booking)',
  hasIndex(Timetable, { teacher: 1, day: 1, periodNumber: 1 }, true)
);
check(
  'User: unique email',
  User.schema.indexes().some(([d, o]) => d.email === 1 && o?.unique)
);
check(
  'Student: unique rollNumber',
  Student.schema.indexes().some(([d, o]) => d.rollNumber === 1 && o?.unique)
);
check(
  'Semester: unique course+number',
  hasIndex(Semester, { course: 1, number: 1 }, true)
);

// ---------- 5. Relationship wiring (ref targets exist) ----------
// Walks top-level paths AND nested sub-document schemas
// (e.g. Class.teachingAssignments.subject, Attendance.records.student).
const collectRefs = (schema, acc = new Set()) => {
  if (!schema?.paths) return acc;
  for (const path of Object.values(schema.paths)) {
    const ref = path?.options?.ref || path?.caster?.options?.ref;
    if (ref) acc.add(ref);
    const sub = path?.schema || path?.caster?.schema;
    if (sub && sub !== schema) collectRefs(sub, acc);
  }
  return acc;
};

const MODEL_REFS = [
  [Student, ['User', 'Department', 'Course', 'Semester', 'Class']],
  [Teacher, ['User', 'Department']],
  [Course, ['Department']],
  [Subject, ['Course', 'Semester']],
  [Class, ['Course', 'Semester', 'Teacher', 'Subject']],
  [Timetable, ['Class', 'Subject', 'Teacher']],
  [Attendance, ['Class', 'Subject', 'Teacher', 'Student', 'User']],
  [LeaveRequest, ['Student', 'Class', 'User']],
  [Notification, ['User']],
];
const refProblems = MODEL_REFS.flatMap(([model, targets]) => {
  const refs = collectRefs(model.schema);
  return targets
    .filter((t) => !refs.has(t))
    .map((t) => `${model.modelName}→${t}`);
});
check(
  'All cross-model references resolve to registered models',
  refProblems.length === 0,
  refProblems.length ? `missing: ${refProblems.join(', ')}` : '9 relationship maps OK'
);

// ---------- Summary ----------
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(' | '));
  process.exit(1);
}
console.log('🎉 All schemas valid. Phase 2 schema check complete.');
process.exit(0);
