/**
 * Phase 3 END-TO-END auth test against the REAL database.
 * Boots the Express app in-process on a random port (no manual server needed),
 * then walks the complete login/role/password-reset workflow over HTTP.
 *
 * Run: npm run test:e2e   (from server/ - uses MONGO_URI in .env)
 */
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';

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
    /* non-JSON response */
  }
  return { status: res.status, body: json };
};

const ADMIN = {
  name: 'Administrator',
  email: 'admin@college.edu',
  password: 'Admin@123',
  role: 'admin',
};
const STUDENT_PASS = 'Student@123';

const run = async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log(`✅ Connected: ${mongoose.connection.name}`);

  // Ensure the seeded admin exists (same as npm run seed)
  if (!(await User.findOne({ email: ADMIN.email }))) {
    await User.create(ADMIN);
    console.log('✅ Seeded default admin');
  }

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  console.log(`✅ App listening on random port for E2E\n`);

  const stamp = Date.now();
  const studentEmail = `e2e.student.${stamp}@test.local`;
  let studentToken = '';
  let adminToken = '';
  let resetToken = '';

  try {
    // ---------- Health ----------
    const health = await req('GET', '/health');
    check('GET /api/health', health.status === 200 && health.body.success === true);

    // ---------- Login failures ----------
    const noUser = await req('POST', '/auth/login', { body: { email: 'ghost@nowhere.test', password: 'whatever1' } });
    check('Login unknown email -> 401 (no user enumeration)', noUser.status === 401, noUser.body?.message);

    const badPass = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: 'wrong-password' } });
    check('Login wrong password -> 401', badPass.status === 401);

    const invalidBody = await req('POST', '/auth/login', { body: { email: 'nope', password: '' } });
    check('Login invalid body -> 400 with field errors', invalidBody.status === 400 && invalidBody.body.errors?.length >= 1);

    // ---------- Admin login ----------
    const adminLogin = await req('POST', '/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
    check('Admin login succeeds -> token', adminLogin.status === 200 && Boolean(adminLogin.body.data?.token));
    adminToken = adminLogin.body.data?.token || '';
    check('Login response user has role=admin', adminLogin.body.data?.user?.role === 'admin');
    check('Login response contains NO password', adminLogin.body.data?.user && !('password' in adminLogin.body.data.user));

    // ---------- /auth/me ----------
    const me = await req('GET', '/auth/me', { token: adminToken });
    check('GET /auth/me with valid token', me.status === 200 && me.body.data?.user?.email === ADMIN.email);

    const meNoToken = await req('GET', '/auth/me');
    check('GET /auth/me without token -> 401', meNoToken.status === 401);

    const meBadToken = await req('GET', '/auth/me', { token: 'not.a.real.token' });
    check('GET /auth/me with garbage token -> 401', meBadToken.status === 401);

    // ---------- Registration (admin-only) ----------
    const created = await req('POST', '/auth/register', {
      token: adminToken,
      body: { name: 'E2E Student', email: studentEmail, password: STUDENT_PASS, role: 'student' },
    });
    check('Admin registers a student -> 201', created.status === 201, `status=${created.status}`);
    check('Created user role is student', created.body.data?.user?.role === 'student');

    const dup = await req('POST', '/auth/register', {
      token: adminToken,
      body: { name: 'E2E Student', email: studentEmail, password: STUDENT_PASS, role: 'student' },
    });
    check('Duplicate email -> 409', dup.status === 409, dup.body?.message);

    const noTokenReg = await req('POST', '/auth/register', {
      body: { name: 'X', email: `x.${stamp}@test.local`, password: 'abcdef123', role: 'admin' },
    });
    check('Register without token -> 401', noTokenReg.status === 401);

    // ---------- Student login + role isolation ----------
    const studentLogin = await req('POST', '/auth/login', { body: { email: studentEmail, password: STUDENT_PASS } });
    check('Student login succeeds', studentLogin.status === 200 && Boolean(studentLogin.body.data?.token));
    studentToken = studentLogin.body.data?.token || '';

    const studentMe = await req('GET', '/auth/me', { token: studentToken });
    check('Student /auth/me -> role student', studentMe.status === 200 && studentMe.body.data?.user?.role === 'student');

    const escalate = await req('POST', '/auth/register', {
      token: studentToken,
      body: { name: 'Sneaky', email: `sneaky.${stamp}@test.local`, password: 'abcdef123', role: 'admin' },
    });
    check('★ Student blocked from admin-only register -> 403', escalate.status === 403, escalate.body?.message);

    // ---------- Change password ----------
    const changeOk = await req('POST', '/auth/change-password', {
      token: studentToken,
      body: { currentPassword: STUDENT_PASS, newPassword: 'Changed@123' },
    });
    check('Change password succeeds', changeOk.status === 200, changeOk.body?.message);

    const oldFail = await req('POST', '/auth/login', { body: { email: studentEmail, password: STUDENT_PASS } });
    check('Old password no longer works -> 401', oldFail.status === 401);

    const newOk = await req('POST', '/auth/login', { body: { email: studentEmail, password: 'Changed@123' } });
    check('New password works', newOk.status === 200);

    // ---------- Forgot / reset password ----------
    const forgot = await req('POST', '/auth/forgot-password', { body: { email: studentEmail } });
    check('Forgot password -> 200', forgot.status === 200);
    resetToken = forgot.body.data?.resetToken || '';
    check('Development mode returns reset token', Boolean(resetToken));

    const reset = await req('POST', '/auth/reset-password', { body: { token: resetToken, newPassword: 'Reset@12345' } });
    check('Reset password with token -> 200', reset.status === 200, reset.body?.message);

    const reuse = await req('POST', '/auth/reset-password', { body: { token: resetToken, newPassword: 'Again@12345' } });
    check('Reset token cannot be reused -> 400', reuse.status === 400);

    const finalLogin = await req('POST', '/auth/login', { body: { email: studentEmail, password: 'Reset@12345' } });
    check('Login after reset works', finalLogin.status === 200);
  } finally {
    // ---------- Cleanup: remove E2E users (keep the seeded admin) ----------
    const { deletedCount } = await User.deleteMany({ email: /e2e\.student\.|sneaky\./ });
    console.log(`\n🧹 Cleaned up ${deletedCount} E2E test users (admin kept)`);
    server.close();
    await mongoose.disconnect();
    console.log('Disconnected.\n');
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Phase 3 end-to-end auth workflow verified on the real database.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n💥 E2E test crashed:', err.message);
  process.exit(1);
});
