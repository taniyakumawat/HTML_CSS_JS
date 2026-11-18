/**
 * Phase 7 END-TO-END reports test against the REAL database.
 * Fixture: 2 classes (t1 -> class1, t2 -> class2), 3 students, 2 subjects,
 * 4 attendance sessions. Verifies:
 *   - all 4 report types (sessions/students/subjects/classes) + summary math
 *   - date-range filter, search, sorting, pagination, trend chart data
 *   - teacher scoping (own classes only, 403 on foreign class/subject)
 *   - PDF + Excel downloads (correct content types + magic bytes)
 *   - student personal PDF, and students blocked from /reports entirely
 *
 * Run: npm run test:reports   (from server/)
 */
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';
import Student from '../src/models/Student.js';
import Teacher from '../src/models/Teacher.js';
import Department from '../src/models/Department.js';
import Course from '../src/models/Course.js';
import Semester from '../src/models/Semester.js';
import Subject from '../src/models/Subject.js';
import Class from '../src/models/Class.js';
import Attendance from '../src/models/Attendance.js';

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`);
};

let base = '';
const req = async (method, path, { body, token } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body: json };
};

/** Binary fetch for export downloads. */
const fetchBytes = async (path, token) => {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    type: res.headers.get('content-type') || '',
    disposition: res.headers.get('content-disposition') || '',
    bytes: buf,
    magic: buf.slice(0, 4).toString('latin1'),
  };
};

const ADMIN = { name: 'Administrator', email: 'admin@college.edu', password: 'Admin@123', role: 'admin' };
const dayISO = (offsetDays) => new Date(Date.now() + offsetDays * 24 * 3600 * 1000).toISOString();
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const run = async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log(`✅ Connected: ${mongoose.connection.name}`);
  if (!(await User.findOne({ email: ADMIN.email }))) {
    await User.create(ADMIN);
    console.log('✅ Seeded default admin');
  }

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  console.log(`✅ App listening on random port for E2E\n`);

  const stamp = Date.now();
  const created = [];
  const track = (model, id) => id && created.push([model, id]);

  let adminToken = '';
  const tokens = {};
  const sessionIds = [];

  try {
    // ============ FIXTURES ============
    const login = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
    adminToken = login.body.data?.token || '';
    check('Admin login', Boolean(adminToken));
    const A = (path, body) => req('POST', path, { token: adminToken, body });

    const dept = (await A('/admin/departments', { name: `E2E P7 Dept ${stamp}`, code: `P7D${String(stamp).slice(-5)}` })).body.data;
    track(Department, dept?._id);
    const course = (await A('/admin/courses', { name: `E2E P7 Course ${stamp}`, code: `P7C${String(stamp).slice(-4)}`, department: dept._id, durationYears: 3, totalSemesters: 6 })).body.data;
    track(Course, course?._id);
    const sem = (await A('/admin/semesters', { course: course._id, number: 1, year: 1, name: `E2E P7 Sem ${stamp}` })).body.data;
    track(Semester, sem?._id);

    const subjA = (await A('/admin/subjects', { name: `E2E P7 SubjA ${stamp}`, code: `P7SA${String(stamp).slice(-4)}`, course: course._id, semester: sem._id, credits: 4 })).body.data;
    track(Subject, subjA?._id);
    const subjB = (await A('/admin/subjects', { name: `E2E P7 SubjB ${stamp}`, code: `P7SB${String(stamp).slice(-4)}`, course: course._id, semester: sem._id, credits: 4 })).body.data;
    track(Subject, subjB?._id);
    // subjectC exists but is assigned to NOBODY -> teacher filter must 403
    const subjC = (await A('/admin/subjects', { name: `E2E P7 SubjC ${stamp}`, code: `P7SC${String(stamp).slice(-4)}`, course: course._id, semester: sem._id, credits: 4 })).body.data;
    track(Subject, subjC?._id);

    const t1 = (await A('/admin/teachers', { name: 'E2E P7 Teacher One', email: `e2e.p7.t1.${stamp}@test.local`, password: 'Teacher@123', employeeId: `P7T1${String(stamp).slice(-4)}`, department: dept._id })).body.data;
    track(Teacher, t1?._id);
    const t2 = (await A('/admin/teachers', { name: 'E2E P7 Teacher Two', email: `e2e.p7.t2.${stamp}@test.local`, password: 'Teacher@123', employeeId: `P7T2${String(stamp).slice(-4)}`, department: dept._id })).body.data;
    track(Teacher, t2?._id);

    const class1 = (await A('/admin/classes', {
      name: `E2E P7 Class1 ${stamp}`, course: course._id, semester: sem._id, section: 'A',
      academicYear: '2026-2027', classTeacher: t1._id,
      teachingAssignments: [
        { subject: subjA._id, teacher: t1._id },
        { subject: subjB._id, teacher: t1._id },
      ],
    })).body.data;
    track(Class, class1?._id);

    const class2 = (await A('/admin/classes', {
      name: `E2E P7 Class2 ${stamp}`, course: course._id, semester: sem._id, section: 'B',
      academicYear: '2026-2027', classTeacher: t2._id,
      teachingAssignments: [{ subject: subjA._id, teacher: t2._id }],
    })).body.data;
    track(Class, class2?._id);

    const mkStudent = async (n, cls) => {
      const s = (await A('/admin/students', {
        name: `E2E P7 Student ${n}`, email: `e2e.p7.s${n}.${stamp}@test.local`, password: 'Student@123',
        rollNumber: `P7S${n}${String(stamp).slice(-4)}`, department: dept._id, course: course._id,
        semester: sem._id, class: cls._id, academicYear: '2026-2027',
      })).body.data;
      track(Student, s?._id);
      return s;
    };
    const s1 = await mkStudent(1, class1);
    const s2 = await mkStudent(2, class1);
    const s3 = await mkStudent(3, class2);

    const logins = [
      ['t1', `e2e.p7.t1.${stamp}@test.local`],
      ['t2', `e2e.p7.t2.${stamp}@test.local`],
      ['s1', `e2e.p7.s1.${stamp}@test.local`],
      ['s3', `e2e.p7.s3.${stamp}@test.local`],
    ];
    for (const [key, email] of logins) {
      const r = await req('POST', '/auth/login', { body: { email, password: key[0] === 's' || key[0] === 's' ? 'Student@123' : 'Teacher@123' } });
      tokens[key] = r.body.data?.token || '';
    }
    check('All logins (t1, t2, s1, s3)', Object.values(tokens).every(Boolean));

    const markSession = async (token, cls, subject, date, records) => {
      const res = await req('POST', '/attendance', { token, body: { class: cls._id, subject, date, records } });
      if (res.status === 201) {
        sessionIds.push(res.body.data._id);
        track(Attendance, res.body.data._id);
      }
      return res.status;
    };
    // class1 (t1): s1 p/l/p, s2 a/p/a  |  class2 (t2): s3 p
    const marks = [
      await markSession(tokens.t1, class1, subjA._id, dayISO(0), [{ student: s1._id, status: 'present' }, { student: s2._id, status: 'absent' }]),
      await markSession(tokens.t1, class1, subjA._id, dayISO(-1), [{ student: s1._id, status: 'late' }, { student: s2._id, status: 'present' }]),
      await markSession(tokens.t1, class1, subjB._id, dayISO(0), [{ student: s1._id, status: 'present' }, { student: s2._id, status: 'absent' }]),
      await markSession(tokens.t2, class2, subjA._id, dayISO(0), [{ student: s3._id, status: 'present' }]),
    ];
    check('Marked 4 sessions', marks.every((s) => s === 201));
    console.log('✅ Fixture created (2 classes, 3 students, 4 sessions)\n');

    // ============ ADMIN: REPORT TYPES ============
    const sessions = await req('GET', '/reports?type=sessions&limit=10', { token: adminToken });
    check('sessions report -> 200, 4 rows', sessions.status === 200 && sessions.body.data?.total === 4, `total=${sessions.body.data?.total}`);
    const ss = sessions.body.data?.summary || {};
    check('sessions summary: P4 L1 A2 / 7 records = 57%', ss.present === 4 && ss.late === 1 && ss.absent === 2 && ss.total === 7 && ss.percentage === 57, JSON.stringify(ss));
    check('session rows populated (class/subject/teacher + %)', sessions.body.data?.items?.every((i) => i.className && i.subjectName && i.teacherName && typeof i.percentage === 'number'));

    const students = await req('GET', '/reports?type=students', { token: adminToken });
    check('students report -> 3 rows', students.status === 200 && students.body.data?.total === 3, `total=${students.body.data?.total}`);
    const srows = Object.fromEntries((students.body.data?.items || []).map((i) => [i.rollNumber, i]));
    const r1 = srows[`P7S1${String(stamp).slice(-4)}`];
    const r2 = srows[`P7S2${String(stamp).slice(-4)}`];
    const r3 = srows[`P7S3${String(stamp).slice(-4)}`];
    check('s1 = 67% (2P/1L of 3)', r1?.percentage === 67 && r1?.present === 2 && r1?.late === 1, JSON.stringify(r1));
    check('s2 = 33% (1P/2A of 3)', r2?.percentage === 33 && r2?.absent === 2, JSON.stringify(r2));
    check('s3 = 100% (1P of 1)', r3?.percentage === 100 && r3?.total === 1, JSON.stringify(r3));
    check('students summary matches (4P/1L/2A of 7)', students.body.data?.summary?.rows === 3 && students.body.data.summary.present === 4 && students.body.data.summary.percentage === 57);

    const subjects = await req('GET', '/reports?type=subjects', { token: adminToken });
    const subjRows = subjects.body.data?.items || [];
    const sa = subjRows.find((r) => r.name.includes('SubjA'));
    const sb = subjRows.find((r) => r.name.includes('SubjB'));
    check('subjects report -> 2 rows', subjects.status === 200 && subjRows.length === 2, `rows=${subjRows.length}`);
    check('subject A: 3 sessions, 60% (3P/1L/1A of 5)', sa?.sessions === 3 && sa?.percentage === 60 && sa?.total === 5, JSON.stringify(sa));
    check('subject B: 1 session, 50%', sb?.sessions === 1 && sb?.percentage === 50, JSON.stringify(sb));

    const classes = await req('GET', '/reports?type=classes', { token: adminToken });
    const clsRows = classes.body.data?.items || [];
    check('classes report -> 2 rows', classes.status === 200 && clsRows.length === 2, `rows=${clsRows.length}`);
    const c1row = clsRows.find((r) => r.name.includes('Class1'));
    const c2row = clsRows.find((r) => r.name.includes('Class2'));
    check('class1: 3 sessions, 50%', c1row?.sessions === 3 && c1row?.percentage === 50, JSON.stringify(c1row));
    check('class2: 1 session, 100%', c2row?.sessions === 1 && c2row?.percentage === 100, JSON.stringify(c2row));

    // ============ FILTERS / SEARCH / SORT / PAGING ============
    const today = todayKey();
    const ranged = await req('GET', `/reports?type=sessions&from=${today}&to=${today}`, { token: adminToken });
    check('date range today only -> 3 sessions (5 records, 60%)', ranged.body.data?.total === 3 && ranged.body.data.summary.total === 5 && ranged.body.data.summary.percentage === 60, `total=${ranged.body.data?.total} summary=${JSON.stringify(ranged.body.data?.summary)}`);

    const clsFiltered = await req('GET', `/reports?type=sessions&class=${class1._id}`, { token: adminToken });
    check('class filter -> only class1 sessions (3)', clsFiltered.body.data?.total === 3);

    const searchS2 = await req('GET', `/reports?type=students&search=${`P7S2${String(stamp).slice(-4)}`}`, { token: adminToken });
    check('search by roll number -> 1 row', searchS2.status === 200 && searchS2.body.data?.total === 1 && searchS2.body.data.items[0].percentage === 33);

    const sorted = await req('GET', '/reports?type=students&sort=-percentage', { token: adminToken });
    check('sort -percentage -> top row 100%', sorted.body.data?.items?.[0]?.percentage === 100);

    const paged = await req('GET', '/reports?type=sessions&limit=2&page=2', { token: adminToken });
    check('pagination: page 2 has 2 items, totalPages 2', paged.body.data?.items?.length === 2 && paged.body.data?.totalPages === 2);

    const badType = await req('GET', '/reports?type=magic', { token: adminToken });
    check('invalid type -> 400', badType.status === 400);
    const badDate = await req('GET', '/reports?type=sessions&from=12-13-2026', { token: adminToken });
    check('invalid date -> 400', badDate.status === 400);

    const trend = await req('GET', '/reports/trend', { token: adminToken });
    check('trend -> 2 daily points (yesterday, today)', trend.status === 200 && trend.body.data?.points?.length === 2, JSON.stringify(trend.body.data?.points?.map((p) => `${p.date}:${p.percentage}%`)));
    const todayPoint = trend.body.data?.points?.find((p) => p.date === today);
    check('trend today = 60% (3P of 5)', todayPoint?.present === 3 && todayPoint?.total === 5 && todayPoint?.percentage === 60, JSON.stringify(todayPoint));

    const optsAdmin = await req('GET', '/reports/options', { token: adminToken });
    check('admin options: 2 classes, >=3 subjects', optsAdmin.status === 200 && optsAdmin.body.data?.classes?.length === 2 && optsAdmin.body.data?.subjects?.length >= 3);

    // ============ TEACHER SCOPING ============
    const tSessions = await req('GET', '/reports?type=sessions', { token: tokens.t1 });
    check('★ t1 sessions -> only my class (3, not 4)', tSessions.status === 200 && tSessions.body.data?.total === 3, `total=${tSessions.body.data?.total}`);
    const tStudents = await req('GET', '/reports?type=students', { token: tokens.t1 });
    check('★ t1 students -> only mine (2, s3 excluded)', tStudents.status === 200 && tStudents.body.data?.total === 2, `total=${tStudents.body.data?.total}`);
    const tClasses = await req('GET', '/reports?type=classes', { token: tokens.t1 });
    check('★ t1 classes -> 1 row', tClasses.status === 200 && tClasses.body.data?.total === 1);
    const tSubjects = await req('GET', '/reports?type=subjects', { token: tokens.t1 });
    check('t1 subjects -> 2 rows (A + B of my class)', tSubjects.status === 200 && tSubjects.body.data?.items?.length === 2);

    const tForeignClass = await req('GET', `/reports?type=sessions&class=${class2._id}`, { token: tokens.t1 });
    check('★ t1 filtering foreign class -> 403', tForeignClass.status === 403, tForeignClass.body?.message);
    const tForeignSubject = await req('GET', `/reports?type=sessions&subject=${subjC._id}`, { token: tokens.t1 });
    check('★ t1 filtering untaught subject -> 403', tForeignSubject.status === 403, tForeignSubject.body?.message);

    const optsTeacher = await req('GET', '/reports/options', { token: tokens.t1 });
    check('t1 options: only my class + my subjects (A,B)', optsTeacher.body.data?.classes?.length === 1 && optsTeacher.body.data?.subjects?.length === 2, JSON.stringify({ c: optsTeacher.body.data?.classes?.length, s: optsTeacher.body.data?.subjects?.length }));

    // ============ EXPORTS: PDF + EXCEL ============
    const adminPdf = await fetchBytes('/reports/export/pdf?type=sessions', adminToken);
    check('★ admin PDF download', adminPdf.status === 200 && adminPdf.type.includes('application/pdf') && adminPdf.magic === '%PDF' && adminPdf.bytes.length > 900, `${adminPdf.type} ${adminPdf.bytes.length}b`);
    check('PDF has attachment filename', adminPdf.disposition.includes('attendance-sessions-') && adminPdf.disposition.includes('.pdf'), adminPdf.disposition);

    const adminXlsx = await fetchBytes('/reports/export/excel?type=students', adminToken);
    check('★ admin Excel download', adminXlsx.status === 200 && adminXlsx.type.includes('spreadsheetml') && adminXlsx.magic.startsWith('PK') && adminXlsx.bytes.length > 900, `${adminXlsx.type} ${adminXlsx.bytes.length}b`);
    check('Excel has .xlsx filename', adminXlsx.disposition.includes('.xlsx'), adminXlsx.disposition);

    const teacherPdf = await fetchBytes('/reports/export/pdf?type=students', tokens.t1);
    check('★ t1 scoped PDF download', teacherPdf.status === 200 && teacherPdf.magic === '%PDF', `${teacherPdf.status} ${teacherPdf.magic}`);

    const emptyPdf = await fetchBytes(`/reports/export/pdf?type=students&search=no-such-student-xyz`, adminToken);
    check('empty-result PDF still valid', emptyPdf.status === 200 && emptyPdf.magic === '%PDF');

    // ============ RBAC ============
    const studentReports = await req('GET', '/reports?type=sessions', { token: tokens.s1 });
    check('★ Student blocked from /reports -> 403', studentReports.status === 403, studentReports.body?.message);
    const studentExport = await fetchBytes('/reports/export/pdf?type=sessions', tokens.s1);
    check('★ Student blocked from /reports/export/pdf -> 403', studentExport.status === 403, `${studentExport.status}`);
    const studentExportX = await fetchBytes('/reports/export/excel', tokens.s1);
    check('Student blocked from /reports/export/excel -> 403', studentExportX.status === 403);
    const teacherStudentPdf = await fetchBytes('/student/report/pdf', tokens.t1);
    check('Teacher blocked from /student/report/pdf -> 403', teacherStudentPdf.status === 403);
    const adminStudentPdf = await fetchBytes('/student/report/pdf', adminToken);
    check('Admin blocked from /student/report/pdf -> 403', adminStudentPdf.status === 403);
    const anonReports = await req('GET', '/reports');
    check('Anonymous /reports -> 401', anonReports.status === 401);

    // ============ STUDENT PERSONAL PDF ============
    const myPdf = await fetchBytes('/student/report/pdf', tokens.s1);
    check('★ Student personal PDF download', myPdf.status === 200 && myPdf.type.includes('application/pdf') && myPdf.magic === '%PDF' && myPdf.bytes.length > 900, `${myPdf.bytes.length}b`);
    check('Personal PDF filename has my roll number', myPdf.disposition.includes(`P7S1${String(stamp).slice(-4)}`), myPdf.disposition);

    const myPdf2 = await fetchBytes('/student/report/pdf', tokens.s3);
    check('Second student PDF valid', myPdf2.status === 200 && myPdf2.magic === '%PDF' && myPdf2.bytes.length > 700, `${myPdf2.bytes.length}b`);
  } finally {
    let removed = 0;
    for (const [model, id] of created) {
      try {
        const r = await model.deleteOne({ _id: id });
        removed += r.deletedCount || 0;
      } catch (e) {
        console.log(`  cleanup skip: ${model.modelName} - ${e.message}`);
      }
    }
    const p7UserIds = (await User.find({ email: /e2e\.p7\./ }).select('_id')).map((u) => u._id);
    const p7Notifs = await Notification.deleteMany({ recipient: { $in: p7UserIds } });
    const users = await User.deleteMany({ email: /e2e\.p7\./ });
    const orphans = await Student.deleteMany({ email: /e2e\.p7\./ });
    const orphanT = await Teacher.deleteMany({ email: /e2e\.p7\./ });
    console.log(`\n🧹 Cleaned up ${removed} docs, ${p7Notifs.deletedCount} notifications, ${users.deletedCount} users, ${orphans.deletedCount} student(s), ${orphanT.deletedCount} teacher(s)`);
    server.close();
    await mongoose.disconnect();
    console.log('Disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Phase 7 reports, analytics and PDF/Excel export verified on the real database.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 E2E test crashed:', err.message);
  process.exit(1);
});
