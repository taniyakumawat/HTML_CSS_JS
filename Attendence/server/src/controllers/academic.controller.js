import { ApiError } from '../middleware/error.js';
import { makeCrud } from '../utils/crudFactory.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Class from '../models/Class.js';
import Timetable from '../models/Timetable.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Attendance from '../models/Attendance.js';

/** Helper for "cannot delete if referenced" checks. */
const inUse = async (checks) => {
  const results = await Promise.all(checks.map(([Model, filter]) => Model.countDocuments(filter)));
  const parts = results.map((count, i) => ({ label: checks[i][2], count })).filter((p) => p.count > 0);
  if (parts.length) {
    const detail = parts.map((p) => `${p.count} ${p.label}`).join(', ');
    throw new ApiError(409, `Cannot delete - still referenced by ${detail}`);
  }
};

// ---------- Department ----------
export const departmentController = makeCrud(Department, {
  name: 'Department',
  searchFields: ['name', 'code', 'description'],
  populate: [{ path: 'head', select: 'name employeeId' }],
  assertDeletable: (req) =>
    inUse([
      [Course, { department: req.params.id }, 'course(s)'],
      [Student, { department: req.params.id }, 'student(s)'],
      [Teacher, { department: req.params.id }, 'teacher(s)'],
    ]),
});

// ---------- Course ----------
export const courseController = makeCrud(Course, {
  name: 'Course',
  searchFields: ['name', 'code', 'description'],
  populate: [{ path: 'department', select: 'name code' }],
  queryFilter: (req) => (req.query.department ? { department: req.query.department } : {}),
  assertDeletable: (req) =>
    inUse([
      [Semester, { course: req.params.id }, 'semester(s)'],
      [Subject, { course: req.params.id }, 'subject(s)'],
      [Class, { course: req.params.id }, 'class(es)'],
      [Student, { course: req.params.id }, 'student(s)'],
    ]),
});

// ---------- Semester ----------
export const semesterController = makeCrud(Semester, {
  name: 'Semester',
  searchFields: ['name'],
  populate: [{ path: 'course', select: 'name code' }],
  queryFilter: (req) => (req.query.course ? { course: req.query.course } : {}),
  assertDeletable: (req) =>
    inUse([
      [Subject, { semester: req.params.id }, 'subject(s)'],
      [Class, { semester: req.params.id }, 'class(es)'],
      [Student, { semester: req.params.id }, 'student(s)'],
    ]),
});

// ---------- Subject ----------
export const subjectController = makeCrud(Subject, {
  name: 'Subject',
  searchFields: ['name', 'code'],
  populate: [
    { path: 'course', select: 'name code' },
    { path: 'semester', select: 'name number' },
  ],
  queryFilter: (req) => {
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.semester) filter.semester = req.query.semester;
    return filter;
  },
  assertDeletable: async (req) => {
    await inUse([
      [Class, { 'teachingAssignments.subject': req.params.id }, 'class assignment(s)'],
      [Timetable, { subject: req.params.id }, 'timetable slot(s)'],
      [Attendance, { subject: req.params.id }, 'attendance record(s)'],
    ]);
  },
});

// ---------- Class ----------
export const classController = makeCrud(Class, {
  name: 'Class',
  searchFields: ['name', 'section', 'academicYear'],
  populate: [
    { path: 'course', select: 'name code' },
    { path: 'semester', select: 'name number' },
    { path: 'classTeacher', select: 'name employeeId' },
    { path: 'teachingAssignments.subject', select: 'name code' },
    { path: 'teachingAssignments.teacher', select: 'name employeeId' },
  ],
  queryFilter: (req) => {
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.semester) filter.semester = req.query.semester;
    return filter;
  },
  assertDeletable: (req) =>
    inUse([
      [Student, { class: req.params.id }, 'student(s)'],
      [Timetable, { class: req.params.id }, 'timetable slot(s)'],
      [Attendance, { class: req.params.id }, 'attendance record(s)'],
    ]),
});

// ---------- Timetable ----------
export const timetableController = makeCrud(Timetable, {
  name: 'Timetable entry',
  searchFields: ['room'],
  populate: [
    { path: 'class', select: 'name' },
    { path: 'subject', select: 'name code' },
    { path: 'teacher', select: 'name employeeId' },
  ],
  queryFilter: (req) => {
    const filter = {};
    if (req.query.class) filter.class = req.query.class;
    if (req.query.day) filter.day = req.query.day;
    if (req.query.teacher) filter.teacher = req.query.teacher;
    return filter;
  },
});
