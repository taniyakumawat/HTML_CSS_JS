/**
 * Phase 8 END-TO-END notifications test against the REAL database.
 * Fixture: 1 class, 1 subject, 2 students, 1 teacher, 1 marked session,
 * 1 correction. Verifies:
 *   - marking notifies every student of the class (own-user recipients only)
 *   - corrections notify ONLY the changed students, with per-student text
 *   - unread counts, mark-one-read, mark-all-read
 *   - isolation: reading/marking someone else's notification -> 404
 *   - RBAC: anonymous -> 401, no user-facing write route (POST -> 404)
 *
 * Run: npm run test:notifications   (from server/)
 */
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import Teacher from '../src/models/Teacher.js';
import Department from '../src/models/Department.js';
import Course from '../src/models/Course.js';
import Semester from '../src/models/Semester.js';
import Subject from '../src/models/Subject.js';
import Class from '../src/models/Class.js';
import Attendance from '../src/models/Attendance.js';
import Notification from '../src/models/Notification.js';

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
const dayISO = (offsetDays) => new Date(Date.now() + offsetDays * 24 * 3600 * 1000).toISOString();

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
  const tokens = {};
  let userIds = [];

  try {
    // ============ FIXTURES ============
    const login = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
    const adminToken = login.body.data?.token || '';
    check('Admin login', Boolean(adminToken));
    const A = (path, body) => req('POST', path, { token: adminToken, body });

    const dept = (await A('/admin/departments', { name: `E2E P8 Dept ${stamp}`, code: `P8D${String(stamp).slice(-5)}` })).body.data;
    track(Department, dept?._id);
    const course = (await A('/admin/courses', { name: `E2E P8 Course ${stamp}`, code: `P8C${String(stamp).slice(-4)}`, department: dept._id, durationYears: 3, totalSemesters: 6 })).body.data;
    track(Course, course?._id);
    const sem = (await A('/admin/semesters', { course: course._id, number: 1, year: 1, name: `E2E P8 Sem ${stamp}` })).body.data;
    track(Semester, sem?._id);
    const subj = (await A('/admin/subjects', { name: `E2E P8 Subj ${stamp}`, code: `P8S${String(stamp).slice(-4)}`, course: course._id, semester: sem._id, credits: 4 })).body.data;
    track(Subject, subj?._id);

    const t1 = (await A('/admin/teachers', { name: 'E2E P8 Teacher', email: `e2e.p8.t1.${stamp}@test.local`, password: 'Teacher@123', employeeId: `P8T${String(stamp).slice(-4)}`, department: dept._id })).body.data;
    track(Teacher, t1?._id);
    const class1 = (await A('/admin/classes', {
      name: `E2E P8 Class ${stamp}`, course: course._id, semester: sem._id, section: 'A',
      academicYear: '2026-2027', classTeacher: t1._id,
      teachingAssignments: [{ subject: subj._id, teacher: t1._id }],
    })).body.data;
    track(Class, class1?._id);

    const mkStudent = async (n) => {
      const s = (await A('/admin/students', {
        name: `E2E P8 Student ${n}`, email: `e2e.p8.s${n}.${stamp}@test.local`, password: 'Student@123',
        rollNumber: `P8S${n}${String(stamp).slice(-4)}`, department: dept._id, course: course._id,
        semester: sem._id, class: class1._id, academicYear: '2026-2027',
      })).body.data;
      track(Student, s?._id);
      return s;
    };
    const s1 = await mkStudent(1);
    const s2 = await mkStudent(2);
    check('Fixture created (class + 2 students)', Boolean(s1?._id && s2?._id && class1?._id));

    const loginAs = async (key, email, password) => {
      const r = await req('POST', '/auth/login', { body: { email, password } });
      tokens[key] = r.body.data?.token || '';
    };
    await loginAs('t1', `e2e.p8.t1.${stamp}@test.local`, 'Teacher@123');
    await loginAs('s1', `e2e.p8.s1.${stamp}@test.local`, 'Student@123');
    await loginAs('s2', `e2e.p8.s2.${stamp}@test.local`, 'Student@123');
    check('Logins (t1, s1, s2)', Object.values(tokens).every(Boolean));

    userIds = (await User.find({ email: /e2e\.p8\./ }).select('_id')).map((u) => u._id);

    // ============ MARKING -> NOTIFY EVERYONE ============
    const mark = await req('POST', '/attendance', {
      token: tokens.t1,
      body: {
        class: class1._id,
        subject: subj._id,
        date: dayISO(0),
        records: [
          { student: s1._id, status: 'present' },
          { student: s2._id, status: 'absent' },
        ],
      },
    });
    check('Mark session -> 201', mark.status === 201);
    const sessionId = mark.body.data?._id;
    track(Attendance, sessionId);

    const s1List = await req('GET', '/notifications', { token: tokens.s1 });
    check('★ s1 gets "Attendance marked" notification', s1List.status === 200 && s1List.body.data?.items?.[0]?.title === 'Attendance marked', JSON.stringify(s1List.body.data?.items?.[0]));
    check('s1 unreadCount = 1', s1List.body.data?.unreadCount === 1, `unread=${s1List.body.data?.unreadCount}`);
    check('notification message contains subject name', (s1List.body.data?.items?.[0]?.message || '').includes('Subj'), s1List.body.data?.items?.[0]?.message);
    check('recipient is s1 own user (never the student id)', String(s1List.body.data?.items?.[0]?.recipient) !== String(s1._id));

    const s2List = await req('GET', '/notifications', { token: tokens.s2 });
    check('★ s2 got their own notification (isolation)', s2List.status === 200 && s2List.body.data?.total === 1 && s2List.body.data?.items?.[0]?.recipient !== s1List.body.data?.items?.[0]?.recipient, `total=${s2List.body.data?.total}`);

    const allAdmin = await req('GET', '/notifications', { token: adminToken });
    check('admin inbox empty (recipient scoping)', allAdmin.status === 200 && allAdmin.body.data?.total === 0, `total=${allAdmin.body.data?.total}`);

    // ============ READ STATES ============
    const s1NotifId = s1List.body.data.items[0]._id;
    const s2NotifId = s2List.body.data.items[0]._id;

    const markRead = await req('PUT', `/notifications/${s1NotifId}/read`, { token: tokens.s1 });
    check('s1 marks own notification read -> 200', markRead.status === 200 && markRead.body.data?.isRead === true);

    const s1After = await req('GET', '/notifications', { token: tokens.s1 });
    check('s1 unreadCount -> 0', s1After.body.data?.unreadCount === 0, `unread=${s1After.body.data?.unreadCount}`);

    const crossRead = await req('PUT', `/notifications/${s2NotifId}/read`, { token: tokens.s1 });
    check('★ s1 marking s2 notification -> 404 (isolation)', crossRead.status === 404, crossRead.body?.message);

    // ============ CORRECTION -> NOTIFY ONLY CHANGED ============
    const fix = await req('PUT', `/attendance/${sessionId}`, {
      token: tokens.t1,
      body: {
        reason: 'Student was absent - correction',
        records: [
          { student: s1._id, status: 'absent' },
          { student: s2._id, status: 'absent' },
        ],
      },
    });
    check('Correction -> 200', fix.status === 200, fix.body?.message);

    const s1AfterFix = await req('GET', '/notifications', { token: tokens.s1 });
    const corrected = s1AfterFix.body.data?.items?.find((n) => n.title === 'Attendance corrected');
    check('★ s1 gets "Attendance corrected" notification', Boolean(corrected), JSON.stringify(s1AfterFix.body.data?.items?.[0]));
    check('correction message shows from -> to + reason', corrected && corrected.message.includes('present -> absent') && corrected.message.includes('correction'), corrected?.message);
    check('s1 total = 2, unread = 1 (newest first)', s1AfterFix.body.data?.total === 2 && s1AfterFix.body.data?.unreadCount === 1, `total=${s1AfterFix.body.data?.total} unread=${s1AfterFix.body.data?.unreadCount}`);
    check('notification type is warning', corrected?.type === 'warning');

    const s2AfterFix = await req('GET', '/notifications', { token: tokens.s2 });
    check('★ unchanged s2 gets NO new notification (total stays 1)', s2AfterFix.body.data?.total === 1, `total=${s2AfterFix.body.data?.total}`);

    const readAll = await req('PUT', '/notifications/read-all', { token: tokens.s2 });
    const s2Done = await req('GET', '/notifications', { token: tokens.s2 });
    check('read-all clears unread', readAll.status === 200 && s2Done.body.data?.unreadCount === 0, `unread=${s2Done.body.data?.unreadCount}`);

    // ============ RBAC / ROUTES ============
    const anon = await req('GET', '/notifications');
    check('Anonymous -> 401', anon.status === 401);
    const postCreate = await req('POST', '/notifications', { token: tokens.s1, body: { title: 'x', message: 'y' } });
    check('No user-facing create route (POST -> 404)', postCreate.status === 404);
    const badId = await req('PUT', '/notifications/aaaaaaaaaaaaaaaaaaaaaaaa/read', { token: tokens.s1 });
    check('Unknown notification id -> 404', badId.status === 404);
    const teacherReadAll = await req('PUT', '/notifications/read-all', { token: tokens.t1 });
    check('teacher read-all works (empty inbox)', teacherReadAll.status === 200);

    console.log('✅ Fixture + notification flows verified\n');
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
    const notifs = await Notification.deleteMany({ recipient: { $in: userIds } });
    const users = await User.deleteMany({ email: /e2e\.p8\./ });
    const orphans = await Student.deleteMany({ email: /e2e\.p8\./ });
    const orphanT = await Teacher.deleteMany({ email: /e2e\.p8\./ });
    console.log(`\n🧹 Cleaned up ${removed} docs, ${notifs.deletedCount} notifications, ${users.deletedCount} users, ${orphans.deletedCount} student(s), ${orphanT.deletedCount} teacher(s)`);
    server.close();
    await mongoose.disconnect();
    console.log('Disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Phase 8 notifications verified on the real database.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 E2E test crashed:', err.message);
  process.exit(1);
});
