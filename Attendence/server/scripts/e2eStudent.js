/**
 * Phase 6 END-TO-END student test against the REAL database.
 * Builds a fixture (dept/course/subjects/teacher/class/students/timetable),
 * marks 3 attendance sessions as the teacher, then verifies the STUDENT view:
 *   - personal stats (overall %, status totals, subject-wise %, shortage flag)
 *   - paginated history with filters (subject/status/month)
 *   - monthly calendar summary
 *   - class timetable
 *   - strict isolation: students only ever see THEIR OWN records
 *   - students can never mark/edit attendance or reach other roles' routes
 *
 * Run: npm run test:student   (from server/ - uses MONGO_URI in .env)
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
const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthOf = (d) => keyOf(d).slice(0, 7);

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

  const now = new Date();
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
  const todayISO = now.toISOString();
  const yesterdayISO = yesterday.toISOString();
  const yesterdaySameMonth = monthOf(yesterday) === monthOf(now);
  const calDaysExpected = yesterdaySameMonth ? 2 : 1;

  let adminToken = '';
  let t1Token = '';
  let s1Token = '';
  let s2Token = '';
  const sessionIds = [];

  try {
    // ============ FIXTURES ============
    const login = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
    adminToken = login.body.data?.token || '';
    check('Admin login', Boolean(adminToken));
    const A = (path, body) => req('POST', path, { token: adminToken, body });

    const dept = (await A('/admin/departments', { name: `E2E P6 Dept ${stamp}`, code: `P6D${String(stamp).slice(-5)}` })).body.data;
    track(Department, dept?._id);
    const course = (await A('/admin/courses', { name: `E2E P6 Course ${stamp}`, code: `P6C${String(stamp).slice(-4)}`, department: dept._id, durationYears: 3, totalSemesters: 6 })).body.data;
    track(Course, course?._id);
    const sem = (await A('/admin/semesters', { course: course._id, number: 1, year: 1, name: `E2E P6 Sem ${stamp}` })).body.data;
    track(Semester, sem?._id);

    const subjA = (await A('/admin/subjects', { name: `E2E P6 SubjectA ${stamp}`, code: `P6SA${String(stamp).slice(-4)}`, course: course._id, semester: sem._id, credits: 4 })).body.data;
    track(Subject, subjA?._id);
    const subjB = (await A('/admin/subjects', { name: `E2E P6 SubjectB ${stamp}`, code: `P6SB${String(stamp).slice(-4)}`, course: course._id, semester: sem._id, credits: 4 })).body.data;
    track(Subject, subjB?._id);

    const t1 = (await A('/admin/teachers', { name: 'E2E P6 Teacher', email: `e2e.p6.t1.${stamp}@test.local`, password: 'Teacher@123', employeeId: `P6T${String(stamp).slice(-4)}`, department: dept._id })).body.data;
    track(Teacher, t1?._id);

    const cls = (await A('/admin/classes', {
      name: `E2E P6 Class ${stamp}`, course: course._id, semester: sem._id, section: 'A',
      academicYear: '2026-2027', classTeacher: t1._id,
      teachingAssignments: [
        { subject: subjA._id, teacher: t1._id },
        { subject: subjB._id, teacher: t1._id },
      ],
    })).body.data;
    track(Class, cls?._id);

    const mkStudent = async (n) => {
      const s = (await A('/admin/students', {
        name: `E2E P6 Student ${n}`, email: `e2e.p6.s${n}.${stamp}@test.local`, password: 'Student@123',
        rollNumber: `P6S${n}${String(stamp).slice(-4)}`, department: dept._id, course: course._id,
        semester: sem._id, class: cls._id, academicYear: '2026-2027',
      })).body.data;
      track(Student, s?._id);
      return s;
    };
    const st1 = await mkStudent(1);
    const st2 = await mkStudent(2);

    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const slot = (await A('/admin/timetable', {
      class: cls._id, day: weekday, periodNumber: 2, startTime: '10:00', endTime: '11:00',
      subject: subjA._id, teacher: t1._id, room: 'R-202', academicYear: '2026-2027',
    })).body.data;
    track(Timetable, slot?._id);

    // ============ MARK 3 SESSIONS AS THE TEACHER ============
    const t1Login = await req('POST', '/auth/login', { body: { email: `e2e.p6.t1.${stamp}@test.local`, password: 'Teacher@123' } });
    t1Token = t1Login.body.data?.token || '';
    check('Teacher login', Boolean(t1Token));

    const markSession = async (subject, date, r1, r2) => {
      const res = await req('POST', '/attendance', {
        token: t1Token,
        body: {
          class: cls._id, subject, date,
          records: [
            { student: st1._id, status: r1 },
            { student: st2._id, status: r2 },
          ],
        },
      });
      if (res.status === 201) {
        track(Attendance, res.body.data?._id);
        sessionIds.push(res.body.data._id);
      }
      return res;
    };

    // s1: present, late, present -> 2/3 = 67%  (below 75 -> shortage)
    // s2: absent,  present, absent -> 1/3 = 33%
    const m1 = await markSession(subjA._id, todayISO, 'present', 'absent');
    const m2 = await markSession(subjA._id, yesterdayISO, 'late', 'present');
    const m3 = await markSession(subjB._id, todayISO, 'present', 'absent');
    check('Marked 3 sessions', m1.status === 201 && m2.status === 201 && m3.status === 201);
    console.log('✅ Fixture + attendance created\n');

    // ============ STUDENT 1: DASHBOARD ============
    const s1Login = await req('POST', '/auth/login', { body: { email: `e2e.p6.s1.${stamp}@test.local`, password: 'Student@123' } });
    s1Token = s1Login.body.data?.token || '';
    check('Student 1 login', Boolean(s1Token));

    const stats = await req('GET', '/student/stats', { token: s1Token });
    check('GET /student/stats -> 200', stats.status === 200);
    const o = stats.body.data?.overall || {};
    check('Overall totals: 3 classes, 2 present, 1 late, 0 absent', o.total === 3 && o.present === 2 && o.late === 1 && o.absent === 0, JSON.stringify(o));
    check('Overall percentage = 67', o.percentage === 67, `got ${o.percentage}`);
    check('★ Shortage warning TRUE (67 < 75)', stats.body.data?.shortage === true && stats.body.data?.threshold === 75);
    const sw = stats.body.data?.subjectWise || [];
    const swA = sw.find((x) => x.subjectId === subjA._id);
    const swB = sw.find((x) => x.subjectId === subjB._id);
    check('Subject-wise: A = 50% (1/2), B = 100% (1/1)', swA?.percentage === 50 && swB?.percentage === 100, JSON.stringify(sw));
    check('Recent records use MY statuses only', (stats.body.data?.recent || []).length === 3 && stats.body.data.recent.every((r) => ['present', 'late'].includes(r.status)));
    check('Profile shows class name', stats.body.data?.profile?.className?.includes('E2E P6 Class'));

    // ============ STUDENT 1: HISTORY ============
    const hist = await req('GET', '/student/attendance?sort=-date,periodNumber', { token: s1Token });
    check('History paginated: 3 sessions', hist.status === 200 && hist.body.data?.total === 3);
    check('History items populated with subject + class',
      hist.body.data?.items?.every((i) => Boolean(i.subject?.name) && Boolean(i.class?.name)));
    check('★ History contains ONLY my statuses', hist.body.data?.items?.every((i) => ['present', 'late'].includes(i.status)));

    const lateOnly = await req('GET', '/student/attendance?status=late', { token: s1Token });
    check('Filter status=late -> 1', lateOnly.status === 200 && lateOnly.body.data?.total === 1);

    // ★ regression: s1 is late in session 2 while s2 is present in the SAME doc.
    //    Dot-notation would wrongly count session 2 for status=present.
    const presentOnly = await req('GET', '/student/attendance?status=present', { token: s1Token });
    check('★ Filter status=present -> 2 (never matches another student\'s record)', presentOnly.status === 200 && presentOnly.body.data?.total === 2, `got ${presentOnly.body.data?.total}`);

    const subjAOnly = await req('GET', `/student/attendance?subject=${subjA._id}`, { token: s1Token });
    check('Filter subject -> 2 sessions', subjAOnly.status === 200 && subjAOnly.body.data?.total === 2);

    const monthExpected = yesterdaySameMonth ? 3 : 2;
    const monthOnly = await req('GET', `/student/attendance?month=${monthOf(now)}`, { token: s1Token });
    check(`Filter month=current -> ${monthExpected}`, monthOnly.status === 200 && monthOnly.body.data?.total === monthExpected, `got ${monthOnly.body.data?.total}`);

    const badMonth = await req('GET', '/student/attendance?month=2026-13', { token: s1Token });
    check('Invalid month -> 400', badMonth.status === 400);
    const badStatus = await req('GET', '/student/attendance?status=maybe', { token: s1Token });
    check('Invalid status filter -> 400', badStatus.status === 400);

    // pagination page beyond range -> empty items but valid shape
    const page2 = await req('GET', '/student/attendance?page=2&limit=2', { token: s1Token });
    check('Pagination page 2 -> 1 item', page2.status === 200 && page2.body.data?.items?.length === 1 && page2.body.data?.totalPages === 2);

    // ============ STUDENT 1: CALENDAR ============
    const cal = await req('GET', `/student/calendar?month=${monthOf(now)}`, { token: s1Token });
    check('GET calendar -> 200 + month echo', cal.status === 200 && cal.body.data?.month === monthOf(now));
    check(`Calendar has ${calDaysExpected} day(s) with sessions`, cal.body.data?.days?.length === calDaysExpected, JSON.stringify(cal.body.data?.days?.map((d) => d.date)));
    const todayCell = (cal.body.data?.days || []).find((d) => d.date === keyOf(now));
    check('Today cell: 2/2 present = 100%', todayCell?.present === 2 && todayCell?.total === 2 && todayCell?.percentage === 100, JSON.stringify(todayCell));
    check('Today cell lists both subjects', todayCell?.subjects?.length === 2);

    // ============ STUDENT 1: TIMETABLE ============
    const tt = await req('GET', '/student/timetable', { token: s1Token });
    check('GET /student/timetable -> my class slot', tt.status === 200 && tt.body.data?.items?.length === 1 && tt.body.data.items[0]._id === slot._id);
    check('Timetable populates subject + teacher', Boolean(tt.body.data?.items?.[0]?.subject?.name) && Boolean(tt.body.data?.items?.[0]?.teacher?.name));

    // ============ ★ ISOLATION: STUDENT 2 SEES ONLY HIS OWN DATA ============
    const s2Login = await req('POST', '/auth/login', { body: { email: `e2e.p6.s2.${stamp}@test.local`, password: 'Student@123' } });
    s2Token = s2Login.body.data?.token || '';
    check('Student 2 login', Boolean(s2Token));

    const s2Stats = await req('GET', '/student/stats', { token: s2Token });
    const o2 = s2Stats.body.data?.overall || {};
    check('★ Student 2 sees HIS totals (1 present), not mine (2)', o2.present === 1 && o2.absent === 2 && o2.total === 3, JSON.stringify(o2));
    check('Student 2 shortage also true (33 < 75)', s2Stats.body.data?.shortage === true);

    const s2Hist = await req('GET', '/student/attendance', { token: s2Token });
    check('★ Student 2 history statuses are his own (absent/present)', s2Hist.body.data?.items?.every((i) => ['absent', 'present'].includes(i.status)));

    // ============ ★ RBAC: STUDENTS CAN NEVER WRITE OR ESCALATE ============
    const stuMark = await req('POST', '/attendance', {
      token: s1Token,
      body: { class: cls._id, subject: subjA._id, date: todayISO, records: [{ student: st1._id, status: 'present' }, { student: st2._id, status: 'present' }] },
    });
    check('★ Student blocked from marking -> 403', stuMark.status === 403, stuMark.body?.message);

    const stuEdit = await req('PUT', `/attendance/${sessionIds[0]}`, {
      token: s1Token,
      body: { reason: 'make me present', records: [{ student: st1._id, status: 'present' }, { student: st2._id, status: 'present' }] },
    });
    check('★ Student blocked from editing attendance -> 403', stuEdit.status === 403);

    const stuSessionView = await req('GET', `/attendance/session?class=${cls._id}&subject=${subjA._id}&date=${todayISO}`, { token: s1Token });
    check('★ Student blocked from marking view -> 403', stuSessionView.status === 403);

    const stuTeacher = await req('GET', '/teacher/stats', { token: s1Token });
    check('★ Student blocked from /teacher/* -> 403', stuTeacher.status === 403);
    const stuAdmin = await req('GET', '/admin/stats', { token: s1Token });
    check('★ Student blocked from /admin/* -> 403', stuAdmin.status === 403);

    const stuWrite = await req('POST', '/student/attendance', { token: s1Token, body: {} });
    check('No write endpoints under /student -> 404', stuWrite.status === 404, `status=${stuWrite.status}`);

    // other roles cannot enter the student workspace
    const teacherTry = await req('GET', '/student/stats', { token: t1Token });
    check('★ Teacher blocked from /student/* -> 403', teacherTry.status === 403);
    const adminTry = await req('GET', '/student/stats', { token: adminToken });
    check('Admin blocked from /student/* (role-scoped) -> 403', adminTry.status === 403);
    const anon = await req('GET', '/student/stats');
    check('Anonymous -> 401', anon.status === 401);
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
    const p6UserIds = (await User.find({ email: /e2e\.p6\./ }).select('_id')).map((u) => u._id);
    const p6Notifs = await Notification.deleteMany({ recipient: { $in: p6UserIds } });
    const users = await User.deleteMany({ email: /e2e\.p6\./ });
    const orphans = await Student.deleteMany({ email: /e2e\.p6\./ });
    const orphanT = await Teacher.deleteMany({ email: /e2e\.p6\./ });
    console.log(`\n🧹 Cleaned up ${removed} docs, ${p6Notifs.deletedCount} notifications, ${users.deletedCount} users, ${orphans.deletedCount} student(s), ${orphanT.deletedCount} teacher(s)`);
    server.close();
    await mongoose.disconnect();
    console.log('Disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Phase 6 student dashboard + attendance viewing verified on the real database.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 E2E test crashed:', err.message);
  process.exit(1);
});
