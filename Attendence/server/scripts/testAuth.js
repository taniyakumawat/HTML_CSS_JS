/**
 * Phase 3 OFFLINE auth tests - no database required.
 * Covers: JWT sign/verify, role guard, validation rules, password hashing
 * behaviour (bcrypt hook + hidden password in JSON).
 *
 * Run: npm run test:auth   (from server/)
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateToken, requireRole } from '../src/middleware/auth.js';
import { validate } from '../src/middleware/validate.js';
import { loginRules, registerRules } from '../src/validations/auth.rules.js';
import User from '../src/models/User.js';
import env from '../src/config/env.js';

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---------- 1. JWT ----------
const token = generateToken('64b000000000000000000001', 'teacher');
const payload = jwt.verify(token, env.jwtSecret);
check('generateToken -> verifiable with server secret', payload.id === '64b000000000000000000001');
check('JWT payload carries role', payload.role === 'teacher');
check('JWT has expiry (expiresIn from .env)', typeof payload.exp === 'number' && payload.iat < payload.exp, `exp-in=${env.jwtExpiresIn}`);

let wrongSecretRejected = false;
try { jwt.verify(token, 'not-the-real-secret'); } catch { wrongSecretRejected = true; }
check('JWT rejected with wrong secret', wrongSecretRejected);

const expired = jwt.sign({ id: 'x', role: 'admin' }, env.jwtSecret, { expiresIn: '-1s' });
let expiredRejected = false;
try { jwt.verify(expired, env.jwtSecret); } catch { expiredRejected = true; }
check('Expired JWT rejected', expiredRejected);

// ---------- 2. requireRole middleware ----------
const mockRes = () => ({ statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } });
const runRole = (user, roles) => {
  let outcome = 'next';
  let err = null;
  requireRole(...roles)({ user }, mockRes(), (e) => { outcome = e ? 'error' : 'next'; err = e; });
  return { outcome, err };
};

const adminOk = runRole({ id: '1', role: 'admin' }, ['admin']);
check('requireRole allows correct role', adminOk.outcome === 'next');

const teacherDenied = runRole({ id: '1', role: 'teacher' }, ['admin']);
check('requireRole blocks wrong role with 403', teacherDenied.outcome === 'error' && teacherDenied.err.statusCode === 403, teacherDenied.err?.message);

const noUser = runRole(undefined, ['admin']);
check('requireRole requires authentication first', noUser.outcome === 'error' && noUser.err.statusCode === 401);

// ---------- 3. Validation rules ----------
const runValidate = async (rules, body) => {
  const req = { body };
  const res = mockRes();
  const chain = validate(rules);
  // last element is the checker; earlier ones are express-validator middlewares
  for (const mw of chain.slice(0, -1)) await mw(req, res, () => {});
  const checker = chain[chain.length - 1];
  let passedToNext = false;
  checker(req, res, () => { passedToNext = true; });
  return { passedToNext, status: res.statusCode, body: res.body };
};

const badLogin = await runValidate(loginRules, { email: 'not-an-email', password: '' });
check('login validation rejects bad email + empty password', !badLogin.passedToNext && badLogin.status === 400 && badLogin.body.errors.length >= 2);

const goodLogin = await runValidate(loginRules, { email: 'Admin@College.EDU', password: 'secret123' });
check('login validation accepts valid credentials (email normalized)', goodLogin.passedToNext);

const badRegister = await runValidate(registerRules, { name: '', email: 'x@y.z', password: '123', role: 'superuser' });
check('register validation rejects empty name, short password, unknown role', !badRegister.passedToNext && badRegister.status === 400);

const goodRegister = await runValidate(registerRules, { name: 'Asha Verma', email: 'asha@college.edu', password: 'Secret@123', role: 'student' });
check('register validation accepts valid payload', goodRegister.passedToNext);

// ---------- 4. Password handling (no DB) ----------
const weak = new User({ name: 'X', email: 'x@y.z', password: '123', role: 'student' });
const weakErr = weak.validateSync();
check('User schema rejects password shorter than 6', Boolean(weakErr?.errors?.password));

const manualHash = await bcrypt.hash('Secret@123', 12);
check('bcrypt hash matches comparePassword logic', await bcrypt.compare('Secret@123', manualHash) === true);
check('bcrypt rejects wrong password', await bcrypt.compare('nope', manualHash) === false);

// Confirm the pre-save hook that performs hashing is registered
let hasPreSaveHook = false;
try {
  const hooks = User.schema.s.hooks;
  if (typeof hooks.hasHooks === 'function') {
    hasPreSaveHook = hooks.hasHooks('save');
  } else if (hooks._pres instanceof Map) {
    hasPreSaveHook = hooks._pres.has('save') && (hooks._pres.get('save')?.length ?? 0) > 0;
  } else {
    hasPreSaveHook = Boolean(hooks._pres?.save?.length);
  }
} catch {
  hasPreSaveHook = false;
}
check('User has pre-save password hash hook', hasPreSaveHook);

const sample = new User({ name: 'X', email: 'x@y.z', password: 'Secret@123', role: 'admin' });
sample.password = manualHash;
const json = JSON.parse(JSON.stringify(sample));
check('toJSON strips password + reset token fields',
  json.password === undefined && json.passwordResetToken === undefined);

const emailCase = new User({ name: 'X', email: '  USER@College.EDU ', password: 'Secret@123', role: 'student' });
check('Email stored lowercase/trimmed (pre-validate)', (() => { emailCase.validateSync(); return emailCase.email === 'user@college.edu'; })());

// ---------- Summary ----------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) { console.log('FAILED auth tests'); process.exit(1); }
console.log('🎉 Phase 3 offline auth tests complete.');
process.exit(0);
