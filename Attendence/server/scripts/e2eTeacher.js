/**
 * Phase 5 END-TO-END teacher + attendance test against the REAL database.
 * Boots the app in-process, builds a fixture (dept/course/subjects/teachers/
 * classes/students/timetable) through the real admin API, then verifies:
 *   - teacher scoping (only my classes/subjects/timetable)
 *   - attendance marking, duplicate prevention, roster validation
 *   - authorized corrections with audit history
 *   - students can never mark or view marking endpoints
 *
 * Run: npm run test:teacher   (from server/ - uses MONGO_URI in .env)
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
import Timetable from '../src/models/Timetable.js';
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

const ADMIN = { name: 'Administrator', email: 'admin@college.edu', password: 'Admin@123', role: 'admin' };

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
  let t1Token = '';
  let stuToken = '';
  let attendanceId = '';
  let sessionDate = new Date().toISOString();

  try {
    // ============ FIXTURES (through the real admin API) ============
    const login = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
    adminToken = login.body.data?.token || '';
    check('Admin login', Boolean(adminToken));
    const A = (path, body) => req('POST', path, { token: adminToken, body });

    const dept = (await A('/admin/departments', { name: `E2E P5 Dept ${stamp}`, code: `P5${String(stamp).slice(-5)}` })).body.data;
    track(Department, dept?._id);

    const course1 = (await A('/admin/courses', { name: `E2E P5 Course1 ${stamp}`, code: `P5C1${String(stamp).slice(-4)}`, department: dept._id, durationYears: 3, totalSemesters: 6 })).body.data;
    track(Course, course1?._id);
    const course2 = (await A('/admin/courses', { name: `E2E P5 Course2 ${stamp}`, code: `P5C2${String(stamp).slice(-4)}`, department: dept._id, durationYears: 3, totalSemesters: 6 })).body.data;
    track(Course, course2?._id);

    const sem1 = (await A('/admin/semesters', { course: course1._id, number: 1, year: 1, name: `E2E P5 Sem1 ${stamp}` })).body.data;
    track(Semester, sem1?._id);
    const sem2 = (await A('/admin/semesters', { course: course2._id, number: 1, year: 1, name: `E2E P5 Sem2 ${stamp}` })).body.data;
    track(Semester, sem2?._id);

    const subjA = (await A('/admin/subjects', { name: `E2E P5 SubjectA ${stamp}`, code: `P5SA${String(stamp).slice(-4)}`, course: course1._id, semester: sem1._id, credits: 4, type: 'theory' })).body.data;
    track(Subject, subjA?._id);
    const subjB = (await A('/admin/subjects', { name: `E2E P5 SubjectB ${stamp}`, code: `P5SB${String(stamp).slice(-4)}`, course: course1._id, semester: sem1._id, credits: 4, type: 'theory' })).body.data;
    track(Subject, subjB?._id);
    const subjC = (await A('/admin/subjects', { name: `E2E P5 SubjectC ${stamp}`, code: `P5SC${String(stamp).slice(-4)}`, course: course2._id, semester: sem2._id, credits: 4, type: 'theory' })).body.data;
    track(Subject, subjC?._id);

    const t1 = (await A('/admin/teachers', { name: 'E2E P5 Teacher One', email: `e2e.p5.t1.${stamp}@test.local`, password: 'Teacher@123', employeeId: `P5T1${String(stamp).slice(-4)}`, department: dept._id })).body.data;
    track(Teacher, t1?._id);
    const t2 = (await A('/admin/teachers', { name: 'E2E P5 Teacher Two', email: `e2e.p5.t2.${stamp}@test.local`, password: 'Teacher@123', employeeId: `P5T2${String(stamp).slice(-4)}`, department: dept._id })).body.data;
    track(Teacher, t2?._id);

    // class1: classTeacher = T2, assignments A->T1, B->T2 (T1 may ONLY mark A)
    const class1 = (await A('/admin/classes', {
      name: `E2E P5 Class1 ${stamp}`, course: course1._id, semester: sem1._id, section: 'A',
      academicYear: '2026-2027', classTeacher: t2._id,
      teachingAssignments: [{ subject: subjA._id, teacher: t1._id }, { subject: subjB._id, teacher: t2._id }],
    })).body.data;
    track(Class, class1?._id);
    // class2: T1 is NOT assigned here at all
    const class2 = (await A('/admin/classes', {
      name: `E2E P5 Class2 ${stamp}`, course: course1._id, semester: sem1._id, section: 'B',
      academicYear: '2026-2027', classTeacher: t2._id,
      teachingAssignments: [{ subject: subjB._id, teacher: t2._id }],
    })).body.data;
    track(Class, class2?._id);

    const mkStudent = async (n) => {
      const s = (await A('/admin/students', {
        name: `E2E P5 Student ${n}`, email: `e2e.p5.s${n}.${stamp}@test.local`, password: 'Student@123',
        rollNumber: `P5S${n}${String(stamp).slice(-4)}`, department: dept._id, course: course1._id,
        semester: sem1._id, class: n === 3 ? class2._id : class1._id, academicYear: '2026-2027',
      })).body.data;
      track(Student, s?._id);
      return s;
    };
    const st1 = await mkStudent(1);
    const st2 = await mkStudent(2);
    const st3 = await mkStudent(3); // class2

    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    const slot = (await A('/admin/timetable', {
      class: class1._id, day: weekday, periodNumber: 1, startTime: '09:00', endTime: '10:00',
      subject: subjA._id, teacher: t1._id, academicYear: '2026-2027',
    })).body.data;
    track(Timetable, slot?._id);
    console.log('✅ Fixture created\n');

    // ============ TEACHER LOGIN + SCOPING ============
    const t1Login = await req('POST', '/auth/login', { body: { email: `e2e.p5.t1.${stamp}@test.local`, password: 'Teacher@123' } });
    t1Token = t1Login.body.data?.token || '';
    check('Teacher 1 login', Boolean(t1Token));

    const myClasses = await req('GET', '/teacher/classes', { token: t1Token });
    check('GET /teacher/classes -> only my class', myClasses.status === 200 && myClasses.body.data?.items?.length === 1 && myClasses.body.data.items[0]._id === class1._id);
    check('Class includes studentCount', myClasses.body.data?.items?.[0]?.studentCount === 2);

    const notMine = await req('GET', `/teacher/classes/${class2._id}/students`, { token: t1Token });
    check('★ Unassigned class roster -> 403', notMine.status === 403, notMine.body?.message);

    const missing = await req('GET', `/teacher/classes/${new mongoose.Types.ObjectId()}/students`, { token: t1Token });
    check('Unknown class roster -> 404', missing.status === 404);

    const roster = await req('GET', `/teacher/classes/${class1._id}/students`, { token: t1Token });
    check('My class roster -> 2 students', roster.status === 200 && roster.body.data?.items?.length === 2);

    const mySubjects = await req('GET', '/teacher/subjects', { token: t1Token });
    check('GET /teacher/subjects -> only assigned subject A', mySubjects.status === 200 && mySubjects.body.data?.items?.length === 1 && mySubjects.body.data.items[0]._id === subjA._id);

    const myTT = await req('GET', '/teacher/timetable', { token: t1Token });
    check('GET /teacher/timetable -> my slot', myTT.status === 200 && myTT.body.data?.items?.length === 1 && myTT.body.data.items[0]._id === slot._id);

    const stats0 = await req('GET', '/teacher/stats', { token: t1Token });
    const s0 = stats0.body.data || {};
    check('GET /teacher/stats -> 200 + shape', stats0.status === 200);
    check('Stats: today has 1 class', s0.todayClasses?.length === 1);
    check('Stats: 2 total students, 1 assigned subject, 0 conducted', s0.totalStudents === 2 && s0.assignedSubjects?.length === 1 && s0.conducted === 0);

    // ============ RBAC: STUDENT CAN NEVER TOUCH ATTENDANCE ============
    const stuLogin = await req('POST', '/auth/login', { body: { email: `e2e.p5.s1.${stamp}@test.local`, password: 'Student@123' } });
    stuToken = stuLogin.body.data?.token || '';
    check('Student 1 login', Boolean(stuToken));

    const stuMark = await req('POST', '/attendance', {
      token: stuToken,
      body: { class: class1._id, subject: subjA._id, date: sessionDate, records: [{ student: st1._id, status: 'present' }] },
    });
    check('★ Student blocked from marking -> 403', stuMark.status === 403, stuMark.body?.message);

    const stuView = await req('GET', `/attendance/session?class=${class1._id}&subject=${subjA._id}&date=${sessionDate}`, { token: stuToken });
    check('★ Student blocked from session view -> 403', stuView.status === 403);

    const stuTeacher = await req('GET', '/teacher/classes', { token: stuToken });
    check('★ Student blocked from /teacher/* -> 403', stuTeacher.status === 403);

    // ============ AUTHORIZATION: WRONG CLASS / SUBJECT ============
    const wrongClass = await req('POST', '/attendance', {
      token: t1Token,
      body: { class: class2._id, subject: subjA._id, date: sessionDate, records: [{ student: st3._id, status: 'present' }] },
    });
    check('★ Teacher marks unassigned class -> 403', wrongClass.status === 403, wrongClass.body?.message);

    const wrongSubject = await req('POST', '/attendance', {
      token: t1Token,
      body: { class: class1._id, subject: subjB._id, date: sessionDate, records: [{ student: st1._id, status: 'present' }, { student: st2._id, status: 'present' }] },
    });
    check('★ Teacher marks subject not assigned to them -> 403', wrongSubject.status === 403, wrongSubject.body?.message);

    const wrongCourse = await req('POST', '/attendance', {
      token: adminToken,
      body: { class: class1._id, subject: subjC._id, date: sessionDate, records: [{ student: st1._id, status: 'present' }, { student: st2._id, status: 'present' }] },
    });
    check('Subject from another course -> 400', wrongCourse.status === 400, wrongCourse.body?.message);

    // ============ MARKING: VALIDATIONS ============
    const missingStudent = await req('POST', '/attendance', {
      token: t1Token,
      body: { class: class1._id, subject: subjA._id, date: sessionDate, records: [{ student: st1._id, status: 'present' }] },
    });
    check('Partial roster -> 400 (must cover all students)', missingStudent.status === 400, missingStudent.body?.message);

    const foreignStudent = await req('POST', '/attendance', {
      token: t1Token,
      body: { class: class1._id, subject: subjA._id, date: sessionDate, records: [{ student: st1._id, status: 'present' }, { student: st3._id, status: 'present' }] },
    });
    check('Foreign student in records -> 400', foreignStudent.status === 400, foreignStudent.body?.message);

    const badStatus = await req('POST', '/attendance', {
      token: t1Token,
      body: { class: class1._id, subject: subjA._id, date: sessionDate, records: [{ student: st1._id, status: 'maybe' }, { student: st2._id, status: 'present' }] },
    });
    check('Invalid status -> 400', badStatus.status === 400, badStatus.body?.message);

    // ============ MARK (HAPPY PATH) ============
    const mark = await req('POST', '/attendance', {
      token: t1Token,
      body: {
        class: class1._id, subject: subjA._id, date: sessionDate, periodNumber: 1,
        records: [{ student: st1._id, status: 'present' }, { student: st2._id, status: 'absent' }],
      },
    });
    check('Mark attendance -> 201', mark.status === 201, mark.body?.message);
    attendanceId = mark.body.data?._id;
    track(Attendance, attendanceId);
    check('Session records teacher + created audit entry',
      Boolean(mark.body.data?.teacher) && mark.body.data?.auditHistory?.[0]?.action === 'created');

    // same day, different TIME -> still blocked (date normalized to start-of-day)
    const dupLater = await req('POST', '/attendance', {
      token: t1Token,
      body: {
        class: class1._id, subject: subjA._id,
        date: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        records: [{ student: st1._id, status: 'absent' }, { student: st2._id, status: 'absent' }],
      },
    });
    check('★ Duplicate same day (different time) -> 409', dupLater.status === 409, dupLater.body?.message);

    // ============ VIEW ============
    const session = await req('GET', `/attendance/session?class=${class1._id}&subject=${subjA._id}&date=${sessionDate}`, { token: t1Token });
    check('GET session -> populated records', session.status === 200 && session.body.data?._id === attendanceId && Boolean(session.body.data.records?.[0]?.student?.name));

    const noSession = await req('GET', `/attendance/session?class=${class1._id}&subject=${subjB._id}&date=${sessionDate}`, { token: t1Token });
    check('GET unmarked session -> data null', noSession.status === 200 && noSession.body.data === null);

    const history = await req('GET', `/attendance/sessions?class=${class1._id}`, { token: t1Token });
    check('GET my session history', history.status === 200 && history.body.data?.items?.some((x) => x._id === attendanceId));

    const stats1 = await req('GET', '/teacher/stats', { token: t1Token });
    const s1 = stats1.body.data || {};
    check('Stats after marking: conducted=1', s1.conducted === 1);
    check('Stats subject-wise % = 50 (1 present / 2)', s1.subjectWise?.length === 1 && s1.subjectWise[0].percentage === 50, JSON.stringify(s1.subjectWise?.[0]));
    check('Stats recent records include the session', s1.recent?.some((r) => r.id === attendanceId));

    // ============ CORRECTION WITH AUDIT ============
    const noReason = await req('PUT', `/attendance/${attendanceId}`, {
      token: t1Token,
      body: { records: [{ student: st1._id, status: 'absent' }, { student: st2._id, status: 'absent' }] },
    });
    check('Correction without reason -> 400', noReason.status === 400, noReason.body?.message);

    const correct = await req('PUT', `/attendance/${attendanceId}`, {
      token: t1Token,
      body: {
        reason: 'Student 1 was marked wrongly - joined 5 min late',
        records: [{ student: st1._id, status: 'absent' }, { student: st2._id, status: 'absent' }],
      },
    });
    check('Authorized correction -> 200', correct.status === 200, correct.body?.message);
    const audit = correct.body.data?.auditHistory || [];
    check('★ Audit history grew (created + corrected)', audit.length === 2 && audit[1].action === 'corrected');
    check('★ Audit records the exact change', audit[1]?.changes?.[0]?.from === 'present' && audit[1]?.changes?.[0]?.to === 'absent');
    check('Audit keeps the reason', Boolean(audit[1]?.reason));

    const noChange = await req('PUT', `/attendance/${attendanceId}`, {
      token: t1Token,
      body: {
        reason: 'no-op check',
        records: [{ student: st1._id, status: 'absent' }, { student: st2._id, status: 'absent' }],
      },
    });
    check('No-op correction -> 200 without new audit', noChange.status === 200 && noChange.body.message === 'No changes detected');

    const wrongTeacher = await req('POST', '/auth/login', { body: { email: `e2e.p5.t2.${stamp}@test.local`, password: 'Teacher@123' } });
    const t2Token = wrongTeacher.body.data?.token || '';
    const t2Edit = await req('PUT', `/attendance/${attendanceId}`, {
      token: t2Token,
      body: { reason: 'not my subject', records: [{ student: st1._id, status: 'present' }, { student: st2._id, status: 'present' }] },
    });
    check('★ Other teacher cannot correct my subject session -> 403', t2Edit.status === 403, t2Edit.body?.message);

    // ============ ADMIN OVERSIGHT ============
    const adminSessions = await req('GET', `/attendance/sessions?class=${class1._id}`, { token: adminToken });
    check('Admin sees all sessions of a class', adminSessions.status === 200 && adminSessions.body.data?.items?.some((x) => x._id === attendanceId));
  } finally {
    let removed = 0;
    // attendance first, then the rest (order within deleteOne loop doesn't matter)
    for (const [model, id] of created) {
      try {
        const r = await model.deleteOne({ _id: id });
        removed += r.deletedCount || 0;
      } catch (e) {
        console.log(`  cleanup skip: ${model.modelName} - ${e.message}`);
      }
    }
    const p5UserIds = (await User.find({ email: /e2e\.p5\./ }).select('_id')).map((u) => u._id);
    const p5Notifs = await Notification.deleteMany({ recipient: { $in: p5UserIds } });
    const users = await User.deleteMany({ email: /e2e\.p5\./ });
    const orphans = await Student.deleteMany({ email: /e2e\.p5\./ });
    const orphanT = await Teacher.deleteMany({ email: /e2e\.p5\./ });
    console.log(`\n🧹 Cleaned up ${removed} docs, ${p5Notifs.deletedCount} notifications, ${users.deletedCount} users, ${orphans.deletedCount} student(s), ${orphanT.deletedCount} teacher(s)`);
    server.close();
    await mongoose.disconnect();
    console.log('Disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Phase 5 teacher workspace + attendance marking verified on the real database.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 E2E test crashed:', err.message);
  process.exit(1);
});
