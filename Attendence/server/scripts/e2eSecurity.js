/**
 * Phase 9 END-TO-END SECURITY test against the REAL database.
 * Covers section 7 of the requirements:
 *   - security headers (helmet)
 *   - NoSQL-injection guards (query params + body validation)
 *   - JWT tampering / wrong secret / expired / garbage tokens
 *   - RBAC escalation matrix (student/teacher/admin boundaries)
 *   - anonymous access to every guarded router
 *   - error handling: JSON 404s, malformed JSON, 1mb body cap, bad ObjectId
 *   - no password leakage in any response
 *   - password-reset anti-enumeration
 *   - bcrypt hashing verified directly in the DB
 *   - production 500 masking (unit-call of the error handler)
 *   - CORS origin policy
 *   - rate limiting: password-reset flood + failed-login brute force
 *     (rate-limit checks MUST stay last - they exhaust the budget)
 *
 * Run: npm run test:security   (from server/)
 */
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import { errorHandler } from '../src/middleware/error.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import Teacher from '../src/models/Teacher.js';
import Department from '../src/models/Department.js';
import Course from '../src/models/Course.js';
import Semester from '../src/models/Semester.js';
import Subject from '../src/models/Subject.js';
import Class from '../src/models/Class.js';
import Notification from '../src/models/Notification.js';

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`);
};

let base = '';
const req = async (method, path, { body, raw, token, headers } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(raw !== undefined || body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, body: json, headers: res.headers };
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
  const tokens = {};
  let userIds = [];

  try {
    // ============ FIXTURES ============
    const login = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
    const adminToken = login.body.data?.token || '';
    check('Admin login', Boolean(adminToken));
    const A = (path, body) => req('POST', path, { token: adminToken, body });

    const dept = (await A('/admin/departments', { name: `E2E P9 Dept ${stamp}`, code: `P9D${String(stamp).slice(-5)}` })).body.data;
    track(Department, dept?._id);
    const course = (await A('/admin/courses', { name: `E2E P9 Course ${stamp}`, code: `P9C${String(stamp).slice(-4)}`, department: dept._id, durationYears: 3, totalSemesters: 6 })).body.data;
    track(Course, course?._id);
    const sem = (await A('/admin/semesters', { course: course._id, number: 1, year: 1, name: `E2E P9 Sem ${stamp}` })).body.data;
    track(Semester, sem?._id);
    const subj = (await A('/admin/subjects', { name: `E2E P9 Subj ${stamp}`, code: `P9S${String(stamp).slice(-4)}`, course: course._id, semester: sem._id, credits: 4 })).body.data;
    track(Subject, subj?._id);
    const t1 = (await A('/admin/teachers', { name: 'E2E P9 Teacher', email: `e2e.p9.t1.${stamp}@test.local`, password: 'Teacher@123', employeeId: `P9T${String(stamp).slice(-4)}`, department: dept._id })).body.data;
    track(Teacher, t1?._id);
    const class1 = (await A('/admin/classes', {
      name: `E2E P9 Class ${stamp}`, course: course._id, semester: sem._id, section: 'A',
      academicYear: '2026-2027', classTeacher: t1._id,
      teachingAssignments: [{ subject: subj._id, teacher: t1._id }],
    })).body.data;
    track(Class, class1?._id);
    const s1 = (await A('/admin/students', {
      name: 'E2E P9 Student 1', email: `e2e.p9.s1.${stamp}@test.local`, password: 'Student@123',
      rollNumber: `P9S1${String(stamp).slice(-4)}`, department: dept._id, course: course._id,
      semester: sem._id, class: class1._id, academicYear: '2026-2027',
    })).body.data;
    track(Student, s1?._id);
    check('Fixture created (class + teacher + student)', Boolean(class1?._id && t1?._id && s1?._id));

    const loginAs = async (key, email, password) => {
      const r = await req('POST', '/auth/login', { body: { email, password } });
      tokens[key] = r.body.data?.token || '';
    };
    await loginAs('t1', `e2e.p9.t1.${stamp}@test.local`, 'Teacher@123');
    await loginAs('s1', `e2e.p9.s1.${stamp}@test.local`, 'Student@123');
    check('Logins (t1, s1)', Boolean(tokens.t1 && tokens.s1));
    userIds = (await User.find({ email: /e2e\.p9\./ }).select('_id')).map((u) => u._id);

    // ============ A. SECURITY HEADERS ============
    const health = await req('GET', '/health');
    check('helmet: X-Content-Type-Options', health.headers.get('x-content-type-options') === 'nosniff');
    check('helmet: X-Frame-Options present', Boolean(health.headers.get('x-frame-options')), health.headers.get('x-frame-options'));

    // ============ B. NOSQL INJECTION (QUERY) ============
    const inj1 = await req('GET', '/admin/students?class[$ne]=null', { token: adminToken });
    check('★ query object param -> 400', inj1.status === 400 && (inj1.body.message || '').includes('Invalid query parameter'), inj1.body.message);
    const inj2 = await req('GET', '/attendance?teacher[$ne]=x', { token: adminToken });
    check('query $ne on attendance list -> 400', inj2.status === 400, inj2.body.message);
    const inj3 = await req('GET', '/admin/students?status=active&status=inactive', { token: adminToken });
    check('repeated (array) query param -> 400', inj3.status === 400, `status=${inj3.status}`);
    const sortInj = await req('GET', '/admin/students?sort=-name,$where', { token: adminToken });
    check('sort operator field is ignored, list still 200', sortInj.status === 200 && sortInj.body.success === true, `status=${sortInj.status}`);

    // ============ C. NOSQL INJECTION (BODY) ============
    const injLogin = await req('POST', '/auth/login', { body: { email: { $ne: '' }, password: 'x' } });
    check('★ login email object -> 400 (validator)', injLogin.status === 400, `status=${injLogin.status}`);
    const injMark = await req('POST', '/attendance', {
      token: tokens.t1,
      body: { class: { $ne: null }, subject: subj._id, date: new Date().toISOString(), records: [] },
    });
    check('mark attendance class object -> 400 (validator)', injMark.status === 400, `status=${injMark.status}`);

    // ============ D. JWT INTEGRITY ============
    const parts = adminToken.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -1)}${parts[2].endsWith('A') ? 'B' : 'A'}`;
    const rTamper = await req('GET', '/auth/me', { token: tampered });
    check('★ tampered signature -> 401', rTamper.status === 401, `status=${rTamper.status}`);
    const decoded = jwt.decode(adminToken);
    const wrongSecret = jwt.sign({ id: decoded.id, role: decoded.role }, 'not-the-server-secret', { expiresIn: '1h' });
    const rWrong = await req('GET', '/auth/me', { token: wrongSecret });
    check('token signed with wrong secret -> 401', rWrong.status === 401, `status=${rWrong.status}`);
    const expired = jwt.sign({ id: decoded.id, role: decoded.role, exp: Math.floor(Date.now() / 1000) - 60 }, env.jwtSecret);
    const rExpired = await req('GET', '/auth/me', { token: expired });
    check('expired token -> 401', rExpired.status === 401, `status=${rExpired.status}`);
    const rGarbage = await req('GET', '/auth/me', { token: 'not.a.real.token' });
    check('garbage token -> 401', rGarbage.status === 401, `status=${rGarbage.status}`);

    // ============ E. RBAC ESCALATION MATRIX ============
    const rbac = [
      ['student -> /admin/students', await req('GET', '/admin/students', { token: tokens.s1 }), 403],
      ['student -> /auth/register', await req('POST', '/auth/register', { token: tokens.s1, body: { name: 'X', email: `e2e.p9.x.${stamp}@test.local`, password: 'Pass@123', role: 'admin' } }), 403],
      ['teacher -> /admin/students', await req('GET', '/admin/students', { token: tokens.t1 }), 403],
      ['student -> /teacher/stats', await req('GET', '/teacher/stats', { token: tokens.s1 }), 403],
      ['teacher -> /student/stats', await req('GET', '/student/stats', { token: tokens.t1 }), 403],
      ['student -> POST /attendance', await req('POST', '/attendance', { token: tokens.s1, body: { class: class1._id, subject: subj._id, date: new Date().toISOString(), records: [] } }), 403],
      ['admin -> /student/stats (not a student)', await req('GET', '/student/stats', { token: adminToken }), 403],
      ['teacher -> POST /admin/students', await req('POST', '/admin/students', { token: tokens.t1, body: { name: 'X' } }), 403],
    ];
    for (const [name, res, want] of rbac) {
      check(`★ ${name} -> ${want}`, res.status === want, `got ${res.status}`);
    }

    // ============ F. ANONYMOUS ACCESS ============
    const anon = [
      await req('GET', '/admin/students'),
      await req('GET', '/notifications'),
      await req('GET', '/attendance/sessions'),
      await req('GET', '/reports'),
    ];
    check('all guarded routers reject anonymous -> 401', anon.every((r) => r.status === 401), anon.map((r) => r.status).join(','));

    // ============ G. ERROR HANDLING ============
    const unknown = await req('GET', '/no-such-route-xyz');
    check('unknown API route -> JSON 404 envelope', unknown.status === 404 && unknown.body?.success === false, `status=${unknown.status}`);
    const badJson = await req('POST', '/auth/login', { raw: '{"broken":' });
    check('malformed JSON -> 400 (not 500)', badJson.status === 400, `status=${badJson.status}`);
    const big = await req('POST', '/auth/login', { raw: `{"pad":"${'x'.repeat(1100000)}"}` });
    check('body over 1mb -> 413', big.status === 413, `status=${big.status}`);
    const badId = await req('PUT', '/notifications/not-an-id/read', { token: tokens.s1 });
    check('invalid ObjectId param -> 400', badId.status === 400, `status=${badId.status}`);

    // ============ H. NO PASSWORD LEAKAGE ============
    const loginBody = JSON.stringify(login.body);
    check('login response has no password field', !loginBody.includes('"password"'));
    const list = await req('GET', '/admin/students', { token: adminToken });
    const noPw = (list.body.data?.items || []).every((i) => !('password' in i));
    check('student list has no password field', noPw && (list.body.data?.items || []).length > 0);
    const me = await req('GET', '/auth/me', { token: tokens.s1 });
    check('/auth/me has no password field', !JSON.stringify(me.body).includes('"password"'));

    // ============ I. PASSWORD RESET SAFETY ============
    const enumProbe = await req('POST', '/auth/forgot-password', { body: { email: `nobody.${stamp}@test.local` } });
    check('forgot-password: unknown email -> fixed message, no token', enumProbe.status === 200 && !enumProbe.body.data?.resetToken && enumProbe.body.message.includes('If that email exists'), enumProbe.body.message);

    // ============ J. BCRYPT HASHING (direct DB) ============
    const tUser = await User.findOne({ email: `e2e.p9.t1.${stamp}@test.local` }).select('+password');
    check('stored password is a bcrypt hash', Boolean(tUser?.password) && tUser.password.startsWith('$2'), tUser?.password?.slice(0, 4));

    // ============ K. PRODUCTION 500 MASKING (unit) ============
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    let captured = null;
    const resMock = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        captured = { code: this.code, payload };
        return this;
      },
    };
    errorHandler(new Error('MongoServerError: internal connection detail'), {}, resMock, () => {});
    process.env.NODE_ENV = prevEnv;
    check(
      '★ production 500 responses are masked',
      captured?.code === 500 && captured.payload.message === 'Internal server error' && !JSON.stringify(captured.payload).includes('connection detail'),
      JSON.stringify(captured?.payload)
    );

    // ============ L. CORS POLICY ============
    const evil = await req('GET', '/health', { headers: { Origin: 'https://evil.example' } });
    const acao = evil.headers.get('access-control-allow-origin');
    check('★ foreign origin gets no CORS allowance', !acao || acao !== 'https://evil.example', `acao=${acao}`);
    const good = await req('GET', '/health', { headers: { Origin: env.clientUrl } });
    check('configured client origin is allowed', good.headers.get('access-control-allow-origin') === env.clientUrl, `acao=${good.headers.get('access-control-allow-origin')}`);

    // ============ M. RATE LIMITING (LAST - exhausts budgets) ============
    let reset429 = false;
    for (let i = 0; i < 16 && !reset429; i += 1) {
      const r = await req('POST', '/auth/forgot-password', { body: { email: ADMIN.email } });
      if (r.status === 429) reset429 = true;
    }
    check('★ password-reset flood -> 429', reset429);

    let login429 = false;
    let attempts = 0;
    for (let i = 0; i < 35 && !login429; i += 1) {
      attempts += 1;
      const r = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: 'definitely-wrong' } });
      if (r.status === 429) login429 = true;
    }
    check('★ failed-login brute force -> 429', login429, `after ${attempts} attempts`);
    const limited = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: 'definitely-wrong' } });
    check('429 keeps the JSON envelope', limited.status === 429 && limited.body.success === false, limited.body.message);

    console.log('✅ Security flows verified\n');
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
    const p9Notifs = await Notification.deleteMany({ recipient: { $in: userIds } });
    const users = await User.deleteMany({ email: /e2e\.p9\./ });
    const orphans = await Student.deleteMany({ email: /e2e\.p9\./ });
    const orphanT = await Teacher.deleteMany({ email: /e2e\.p9\./ });
    console.log(`\n🧹 Cleaned up ${removed} docs, ${p9Notifs.deletedCount} notifications, ${users.deletedCount} users, ${orphans.deletedCount} student(s), ${orphanT.deletedCount} teacher(s)`);
    server.close();
    await mongoose.disconnect();
    console.log('Disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Phase 9 security verified on the real database.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 E2E test crashed:', err.message);
  process.exit(1);
});
