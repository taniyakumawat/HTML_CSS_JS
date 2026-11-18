/**
 * Phase 2 LIVE database smoke test.
 * Verifies the real MongoDB connection: model CRUD, unique indexes,
 * duplicate-attendance prevention, password hashing and populate queries.
 * All test data is removed afterwards.
 *
 * Run: npm run smoke-test   (from server/ - requires MONGO_URI in .env)
 */
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import {
  User, Student, Teacher, Department, Course, Subject,
  Semester, Class, Timetable, Attendance, LeaveRequest, Notification,
} from '../src/models/index.js';

const ALL_MODELS = [User, Student, Teacher, Department, Course, Subject,
  Semester, Class, Timetable, Attendance, LeaveRequest, Notification];

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`);
};

/** Expect a Mongo error with a specific code (11000 = duplicate key). */
const expectMongoError = async (name, fn, expectedCode) => {
  try {
    await fn();
    check(name, false, 'no error thrown');
  } catch (err) {
    check(name, err.code === expectedCode, `got code ${err.code}: ${err.message?.slice(0, 80)}`);
  }
};

/** Expect a Mongoose validation error. */
const expectValidationError = async (name, fn) => {
  try {
    await fn();
    check(name, false, 'validation passed unexpectedly');
  } catch (err) {
    check(name, err.name === 'ValidationError', `got ${err.name}`);
  }
};

const run = async () => {
  console.log(`\nConnecting to: ${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')}\n`);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  check('Connect to MongoDB', true, `${mongoose.connection.host}/${mongoose.connection.name}`);

  // ---- Sync indexes (creates the unique indexes) ----
  for (const model of ALL_MODELS) {
    await model.syncIndexes();
  }
  check('Sync indexes for all 12 models', true);

  // ---- Remove leftovers from any previously crashed run (idempotency) ----
  const staleClasses = await Class.find({ name: /^SMK-/ }).select('_id');
  const staleClassIds = staleClasses.map((c) => c._id);
  const staleCourses = await Course.find({ code: /^SMK-/ }).select('_id');
  const staleCourseIds = staleCourses.map((c) => c._id);
  await Promise.all([
    Attendance.deleteMany({ class: { $in: staleClassIds } }),
    Timetable.deleteMany({ class: { $in: staleClassIds } }),
    LeaveRequest.deleteMany({ class: { $in: staleClassIds } }),
    Notification.deleteMany({ title: 'SMOKETEST notice' }),
    Student.deleteMany({ rollNumber: /^SMK-/ }),
    Teacher.deleteMany({ employeeId: /^SMK-/ }),
    User.deleteMany({ email: /@college\.test$/ }),
    Class.deleteMany({ name: /^SMK-/ }),
    Subject.deleteMany({ code: /^SMK-/ }),
    Semester.deleteMany({ course: { $in: staleCourseIds } }),
    Course.deleteMany({ code: /^SMK-/ }),
    Department.deleteMany({ code: 'SMK' }),
  ]);
  check('Pre-run cleanup of stale test data', true);

  const createdDocs = [];
  const track = (doc) => { createdDocs.push(doc); return doc; };

  try {
    // ---------- Department / Course / Semester / Subject / Class ----------
    const dept = track(await Department.create({ name: 'Smoke Test Dept', code: 'SMK' }));
    const course = track(await Course.create({
      name: 'Smoke Test Course', code: 'SMK-CRS', department: dept._id,
      durationYears: 2, totalSemesters: 4,
    }));
    const sem = track(await Semester.create({
      course: course._id, number: 1, year: 1, name: 'Semester 1',
    }));
    const subject = track(await Subject.create({
      name: 'Smoke Subject', code: 'SMK-101', course: course._id, semester: sem._id,
    }));
    const classDoc = track(await Class.create({
      name: 'SMK-1-A', course: course._id, semester: sem._id, section: 'A',
      academicYear: '2025-2026',
    }));
    check('Create Department→Course→Semester→Subject→Class chain', Boolean(classDoc._id));

    // Duplicate department name must fail (unique index)
    await expectMongoError(
      'Unique index: duplicate department name rejected',
      () => Department.create({ name: 'Smoke Test Dept', code: 'SMK2' }),
      11000
    );

    // ---------- User (password hashing) + Teacher + Student ----------
    const plainPassword = 'Test@12345';
    const adminUser = track(await User.create({
      name: 'Smoke Admin', email: 'smoke.admin@college.test',
      password: plainPassword, role: 'admin',
    }));
    const stored = await User.findById(adminUser._id).select('+password');
    check('Password stored hashed (bcrypt)', stored.password !== plainPassword && stored.password.startsWith('$2'));
    check('comparePassword() verifies correct password', await stored.comparePassword(plainPassword) === true);
    check('comparePassword() rejects wrong password', (await stored.comparePassword('wrong')) === false);
    const safeJSON = JSON.parse(JSON.stringify(stored));
    check('toJSON strips password', safeJSON.password === undefined);

    const teacherUser = track(await User.create({
      name: 'Smoke Teacher', email: 'smoke.teacher@college.test',
      password: plainPassword, role: 'teacher',
    }));
    const teacher = track(await Teacher.create({
      user: teacherUser._id, employeeId: 'SMK-T01', name: 'Smoke Teacher',
      email: 'smoke.teacher@college.test', department: dept._id,
    }));

    const studentUser = track(await User.create({
      name: 'Smoke Student', email: 'smoke.student@college.test',
      password: plainPassword, role: 'student',
    }));
    const student = track(await Student.create({
      user: studentUser._id, rollNumber: 'SMK-R01', name: 'Smoke Student',
      email: 'smoke.student@college.test', department: dept._id, course: course._id,
      semester: sem._id, class: classDoc._id, academicYear: '2025-2026',
    }));
    check('Create User (admin/teacher/student) + profiles', Boolean(student._id && teacher._id));

    // Assign the teacher now that it exists
    classDoc.teachingAssignments = [{ subject: subject._id, teacher: teacher._id }];
    await classDoc.save();

    // Validation: student without required refs must fail
    await expectValidationError(
      'Validation: student without academic refs rejected',
      () => Student.create({ name: 'No Refs', email: 'x@y.z', rollNumber: 'SMK-R02' })
    );

    // ---------- Timetable: teacher double-booking prevented ----------
    const slot = {
      day: 'monday', periodNumber: 1, startTime: '09:00', endTime: '10:00',
      subject: subject._id, teacher: teacher._id, academicYear: '2025-2026',
    };
    track(await Timetable.create({ ...slot, class: classDoc._id }));
    const otherClass = track(await Class.create({
      name: 'SMK-2-A', course: course._id, semester: sem._id, section: 'A',
      academicYear: '2025-2026',
    }));
    await expectMongoError(
      'Unique index: teacher double-booking rejected',
      () => Timetable.create({ ...slot, class: otherClass._id }),
      11000
    );
    await expectMongoError(
      'Unique index: class same-slot duplicate rejected',
      () => Timetable.create({ ...slot, class: classDoc._id, subject: subject._id }),
      11000
    );

    // ---------- Attendance: THE core duplicate prevention ----------
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const att = track(await Attendance.create({
      class: classDoc._id, subject: subject._id, teacher: teacher._id,
      date: today, periodNumber: 1, markedBy: adminUser._id,
      records: [{ student: student._id, status: 'present' }],
    }));
    check('Create attendance record', Boolean(att._id));

    await expectMongoError(
      '★ Duplicate attendance (same class+subject+date) rejected',
      () => Attendance.create({
        class: classDoc._id, subject: subject._id, date: today,
        markedBy: adminUser._id, records: [{ student: student._id, status: 'absent' }],
      }),
      11000
    );

    // ---------- Audit history + percentage inputs ----------
    att.auditHistory.push({
      action: 'corrected', changedBy: adminUser._id, reason: 'Student arrived late',
      changes: [{ student: student._id, from: 'absent', to: 'late' }],
    });
    att.records[0].status = 'late';
    await att.save();
    const reloaded = await Attendance.findById(att._id);
    check('Audit history persisted on correction',
      reloaded.auditHistory.length === 1 && reloaded.auditHistory[0].reason === 'Student arrived late');

    // ---------- Populate relationships ----------
    const roster = await Student.find({ class: classDoc._id }).populate('course').populate('class');
    check('Populate: students→course/class',
      roster.length === 1 && roster[0].course?.code === 'SMK-CRS' && roster[0].class?.name === 'SMK-1-A');

    const schedule = await Timetable.find({ class: classDoc._id }).populate('teacher').populate('subject');
    check('Populate: timetable→teacher/subject',
      schedule.length === 1 && schedule[0].teacher?.employeeId === 'SMK-T01');

    const myAttendance = await Attendance.find({ 'records.student': student._id }).populate('subject');
    check('Student attendance history query works',
      myAttendance.length === 1 && myAttendance[0].subject?.code === 'SMK-101');

    // ---------- Leave + Notification ----------
    track(await LeaveRequest.create({
      student: student._id, class: classDoc._id, type: 'sick',
      fromDate: today, toDate: today, reason: 'Smoke test leave',
    }));
    track(await Notification.create({
      recipient: adminUser._id, title: 'SMOKETEST notice', message: 'Hello', type: 'info',
    }));
    check('Create LeaveRequest + Notification', true);

    // ---------- Percentage math sanity (per-subject formula) ----------
    const totalConducted = await Attendance.countDocuments({ subject: subject._id });
    const all = await Attendance.find({ subject: subject._id });
    const presentCount = all.reduce(
      (sum, a) => sum + a.records.filter((r) => ['present', 'late'].includes(r.status)).length, 0
    );
    const totalStudents = all.reduce((sum, a) => sum + a.records.length, 0);
    const pct = totalStudents ? Math.round((presentCount / totalStudents) * 100) : 0;
    check('Attendance % calculation runs', totalConducted === 1 && pct === 100, `pct=${pct}%`);
  } finally {
    // ---------- Cleanup ONLY the documents this test created ----------
    console.log(`\n🧹 Cleaning up ${createdDocs.length} smoke-test documents...`);
    for (const doc of createdDocs) {
      try {
        const modelName = doc.constructor?.modelName;
        if (!modelName) throw new Error('cannot resolve model name');
        await mongoose.model(modelName).deleteOne({ _id: doc._id });
      } catch (err) {
        console.log(`   ⚠️ cleanup failed for ${doc.constructor?.modelName || 'unknown'}: ${err.message}`);
      }
    }
    await mongoose.disconnect();
    console.log('🧹 Done - disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Live database smoke test complete - Phase 2 verified end-to-end.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 Smoke test crashed:', err.message);
  process.exit(1);
});
