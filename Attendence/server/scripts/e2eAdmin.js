/**
 * Phase 4 END-TO-END admin CRUD test against the REAL database.
 * Boots the Express app in-process on a random port, then walks the whole
 * admin management workflow over HTTP: department -> course -> semester ->
 * subject -> teacher -> class -> student -> timetable -> stats -> RBAC ->
 * delete-protections -> cleanup.
 *
 * Run: npm run test:admin   (from server/ - uses MONGO_URI in .env)
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
import Timetable from '../src/models/Timetable.js';

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
  const ids = { created: [] };
  const track = (model, id) => {
    ids.created.push([model, id]);
    return id;
  };
  let adminToken = '';
  let studentToken = '';

  try {
    // ---------- Auth ----------
    const login = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
    adminToken = login.body.data?.token || '';
    check('Admin login', Boolean(adminToken));

    // ---------- RBAC: unauthenticated ----------
    const noToken = await req('GET', '/admin/stats');
    check('GET /admin/stats without token -> 401', noToken.status === 401);

    const noTokenList = await req('GET', '/admin/departments');
    check('GET /admin/departments without token -> 401', noTokenList.status === 401);

    // ---------- Department ----------
    const deptBody = { name: `E2E Dept ${stamp}`, code: `D${String(stamp).slice(-6)}`, description: 'created by e2e' };
    const dept = await req('POST', '/admin/departments', { token: adminToken, body: deptBody });
    check('Create department -> 201', dept.status === 201, `status=${dept.status}`);
    const deptId = dept.body.data?._id;
    if (deptId) track(Department, deptId);
    check('Department has _id', Boolean(deptId));

    const deptBad = await req('POST', '/admin/departments', { token: adminToken, body: { code: 'X' } });
    check('Create department without name -> 400', deptBad.status === 400 && deptBad.body.errors?.length >= 1);

    // ---------- Course ----------
    const courseBody = {
      name: `E2E Course ${stamp}`,
      code: `C${String(stamp).slice(-6)}`,
      department: deptId,
      durationYears: 3,
      totalSemesters: 6,
    };
    const course = await req('POST', '/admin/courses', { token: adminToken, body: courseBody });
    check('Create course -> 201', course.status === 201, `status=${course.status}`);
    const courseId = course.body.data?._id;
    if (courseId) track(Course, courseId);

    const courseBad = await req('POST', '/admin/courses', { token: adminToken, body: { name: 'No dept', code: 'ND' } });
    check('Create course without department -> 400', courseBad.status === 400);

    // ---------- Semester ----------
    const sem = await req('POST', '/admin/semesters', {
      token: adminToken,
      body: { course: courseId, number: 1, year: 1, name: `E2E Semester 1 ${stamp}` },
    });
    check('Create semester -> 201', sem.status === 201, `status=${sem.status}`);
    const semId = sem.body.data?._id;
    if (semId) track(Semester, semId);

    // ---------- Subject ----------
    const subj = await req('POST', '/admin/subjects', {
      token: adminToken,
      body: { name: `E2E Subject ${stamp}`, code: `S${String(stamp).slice(-6)}`, course: courseId, semester: semId, credits: 4, type: 'theory' },
    });
    check('Create subject -> 201', subj.status === 201, `status=${subj.status}`);
    const subjId = subj.body.data?._id;
    if (subjId) track(Subject, subjId);

    // ---------- Teacher (User + profile) ----------
    const teacherEmail = `e2e.p4.teacher.${stamp}@test.local`;
    const teacher = await req('POST', '/admin/teachers', {
      token: adminToken,
      body: { name: 'E2E Teacher', email: teacherEmail, password: 'Teacher@123', employeeId: `T${String(stamp).slice(-6)}`, department: deptId, qualification: 'M.Sc' },
    });
    check('Create teacher (user + profile) -> 201', teacher.status === 201, `status=${teacher.status}`);
    const teacherId = teacher.body.data?._id;
    if (teacherId) track(Teacher, teacherId);
    check('Teacher profile links a user account', Boolean(teacher.body.data?.user?.email));

    const teacherDup = await req('POST', '/admin/teachers', {
      token: adminToken,
      body: { name: 'Dup', email: teacherEmail, password: 'Teacher@123', employeeId: 'DUP1' },
    });
    check('Duplicate teacher email -> 409', teacherDup.status === 409, teacherDup.body?.message);

    // ---------- Class (with teaching assignment) ----------
    const cls = await req('POST', '/admin/classes', {
      token: adminToken,
      body: {
        name: `E2E Class ${stamp}`,
        course: courseId,
        semester: semId,
        section: 'A',
        academicYear: '2026-2027',
        classTeacher: teacherId,
        teachingAssignments: [{ subject: subjId, teacher: teacherId }],
      },
    });
    check('Create class with teaching assignment -> 201', cls.status === 201, `status=${cls.status}`);
    const classId = cls.body.data?._id;
    if (classId) track(Class, classId);
    check('Class stores teaching assignment', cls.body.data?.teachingAssignments?.length === 1);

    const classUpdate = await req('PUT', `/admin/classes/${classId}`, {
      token: adminToken,
      body: {
        name: `E2E Class ${stamp} B`,
        course: courseId,
        semester: semId,
        section: 'B',
        academicYear: '2026-2027',
        classTeacher: teacherId,
        teachingAssignments: [{ subject: subjId, teacher: teacherId }],
      },
    });
    check('Update class -> 200', classUpdate.status === 200 && classUpdate.body.data?.section === 'B');

    // ---------- Student (User + profile) ----------
    const studentEmail = `e2e.p4.student.${stamp}@test.local`;
    const roll = `R${String(stamp).slice(-6)}`;
    const student = await req('POST', '/admin/students', {
      token: adminToken,
      body: {
        name: 'E2E Student',
        email: studentEmail,
        password: 'Student@123',
        rollNumber: roll,
        department: deptId,
        course: courseId,
        semester: semId,
        class: classId,
        academicYear: '2026-2027',
      },
    });
    check('Create student (user + profile) -> 201', student.status === 201, `status=${student.status}`);
    const studentId = student.body.data?._id;
    if (studentId) track(Student, studentId);
    check('Student profile links a user account', Boolean(student.body.data?.user?.email));

    const studentDup = await req('POST', '/admin/students', {
      token: adminToken,
      body: { name: 'Dup', email: studentEmail, password: 'Student@123', rollNumber: 'DUP2', department: deptId, course: courseId, semester: semId, class: classId, academicYear: '2026-2027' },
    });
    check('Duplicate student email -> 409', studentDup.status === 409, studentDup.body?.message);

    // ---------- Lists, search & filters ----------
    const stuList = await req('GET', `/admin/students?search=${roll}`, { token: adminToken });
    check('Student list pagination shape', stuList.status === 200 && Array.isArray(stuList.body.data?.items) && typeof stuList.body.data?.total === 'number');
    check('Search by roll number finds the student', stuList.body.data?.items?.some((s) => s.rollNumber === roll));

    const subjByCourse = await req('GET', `/admin/subjects?course=${courseId}`, { token: adminToken });
    check('Subject list filters by course', subjByCourse.status === 200 && subjByCourse.body.data?.items?.length === 1);

    const clsByCourse = await req('GET', `/admin/classes?course=${courseId}`, { token: adminToken });
    check('Class list filters by course', clsByCourse.status === 200 && clsByCourse.body.data?.items?.some((c) => c._id === classId));

    // ---------- Timetable ----------
    try {
      await Timetable.init(); // guarantee unique-slot indexes exist before clash tests
    } catch (e) {
      console.log(`  ⚠ Timetable index warning: ${e.message}`);
    }

    // second class so we can test the "same teacher slot" index (different class)
    const cls2 = await req('POST', '/admin/classes', {
      token: adminToken,
      body: { name: `E2E Class ${stamp} 2`, course: courseId, semester: semId, section: 'C', academicYear: '2026-2027' },
    });
    const class2Id = cls2.body.data?._id;
    if (class2Id) track(Class, class2Id);

    const slot = await req('POST', '/admin/timetable', {
      token: adminToken,
      body: { class: classId, day: 'monday', periodNumber: 1, startTime: '09:00', endTime: '10:00', subject: subjId, teacher: teacherId, room: 'R-101', academicYear: '2026-2027' },
    });
    check('Create timetable entry -> 201', slot.status === 201, `status=${slot.status}`);
    const slotId = slot.body.data?._id;
    if (slotId) track(Timetable, slotId);

    const teacherClash = await req('POST', '/admin/timetable', {
      token: adminToken,
      body: { class: class2Id, day: 'monday', periodNumber: 1, startTime: '10:00', endTime: '11:00', subject: subjId, teacher: teacherId },
    });
    check('★ Same teacher + slot in another class -> 409', teacherClash.status === 409, teacherClash.body?.message);

    const classClash = await req('POST', '/admin/timetable', {
      token: adminToken,
      body: { class: classId, day: 'monday', periodNumber: 1, startTime: '11:00', endTime: '12:00', subject: subjId, teacher: teacherId },
    });
    check('★ Same class + period -> 409', classClash.status === 409, classClash.body?.message);

    // ---------- RBAC: student is completely blocked ----------
    const stuLogin = await req('POST', '/auth/login', { body: { email: studentEmail, password: 'Student@123' } });
    studentToken = stuLogin.body.data?.token || '';
    check('E2E student can log in', Boolean(studentToken));

    const stuStats = await req('GET', '/admin/stats', { token: studentToken });
    check('★ Student blocked from /admin/stats -> 403', stuStats.status === 403, stuStats.body?.message);

    const stuCreate = await req('POST', '/admin/departments', { token: studentToken, body: { name: 'H4x', code: 'H4X' } });
    check('★ Student blocked from creating departments -> 403', stuCreate.status === 403);

    const stuDelete = await req('DELETE', `/admin/classes/${classId}`, { token: studentToken });
    check('★ Student blocked from deleting classes -> 403', stuDelete.status === 403);

    // ---------- Stats ----------
    const stats = await req('GET', '/admin/stats', { token: adminToken });
    check('GET /admin/stats -> 200', stats.status === 200);
    const s = stats.body.data || {};
    check('Stats totals include our student', (s.totals?.students || 0) >= 1);
    check('Stats totals include our teacher', (s.totals?.teachers || 0) >= 1);
    check('Stats totals include our class & subject', (s.totals?.classes || 0) >= 1 && (s.totals?.subjects || 0) >= 1);
    check('Stats trend has 7 days', Array.isArray(s.trend) && s.trend.length === 7);
    check('Stats overall percentage is a number', typeof s.overall?.percentage === 'number');
    check('Stats today has session counters', typeof s.today?.sessions === 'number');

    // ---------- Delete protections ----------
    const courseDelete = await req('DELETE', `/admin/courses/${courseId}`, { token: adminToken });
    check('★ Deleting a course in use -> 409', courseDelete.status === 409, courseDelete.body?.message);

    const deptDelete = await req('DELETE', `/admin/departments/${deptId}`, { token: adminToken });
    check('★ Deleting a department in use -> 409', deptDelete.status === 409, deptDelete.body?.message);

    const subjDelete = await req('DELETE', `/admin/subjects/${subjId}`, { token: adminToken });
    check('★ Deleting a subject assigned to a class -> 409', subjDelete.status === 409, subjDelete.body?.message);

    // ---------- Student deactivation (soft delete) ----------
    const deactivate = await req('DELETE', `/admin/students/${studentId}`, { token: adminToken });
    check('Deactivate student -> 200', deactivate.status === 200, deactivate.body?.message);
    const inactiveUser = await User.findById(student.body.data?.user?._id);
    check('★ Linked user account also deactivated', inactiveUser?.isActive === false);

    const blockedLogin = await req('POST', '/auth/login', { body: { email: studentEmail, password: 'Student@123' } });
    check(
      '★ Deactivated student cannot log in -> 403',
      blockedLogin.status === 403 || blockedLogin.status === 401,
      blockedLogin.body?.message
    );

    const restore = await req('POST', `/admin/students/${studentId}/restore`, { token: adminToken });
    check('Restore student -> 200', restore.status === 200);
    const reactivated = await User.findById(student.body.data?.user?._id);
    check('★ Linked user account reactivated', reactivated?.isActive === true);
  } finally {
    // ---------- Cleanup everything we created ----------
    let removed = 0;
    for (const [model, id] of ids.created) {
      try {
        const res = await model.deleteOne({ _id: id });
        removed += res.deletedCount || 0;
      } catch (e) {
        console.log(`  cleanup skip: ${model.modelName} - ${e.message}`);
      }
    }
    const users = await User.deleteMany({ email: /e2e\.p4\./ });
    const orphans = await Student.deleteMany({ email: /e2e\.p4\./ });
    const orphanT = await Teacher.deleteMany({ email: /e2e\.p4\./ });
    console.log(
      `\n🧹 Cleaned up ${removed} docs, ${users.deletedCount} users, ${orphans.deletedCount} student(s), ${orphanT.deletedCount} teacher(s)`
    );
    server.close();
    await mongoose.disconnect();
    console.log('Disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Phase 4 admin CRUD workflow verified on the real database.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 E2E test crashed:', err.message);
  process.exit(1);
});
