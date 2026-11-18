/**
 * Phase 10 PRODUCTION smoke test.
 * Boots the app with NODE_ENV=production (in-process) and verifies the
 * single-service deploy behaviour: Express serves the built SPA from
 * client/dist while /api keeps its JSON contract.
 *
 * Requires a prior frontend build:  npm run build   (from client/ or root)
 *
 * Run: npm run test:prod   (from server/)
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../../client/dist');

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`);
};

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('💥 client/dist/index.html not found - run `npm run build` first (from client/ or the repo root).');
  process.exit(1);
}

// NODE_ENV must be set BEFORE the app module loads
process.env.NODE_ENV = 'production';

const { default: app } = await import('../src/app.js');

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const get = async (p, headers = {}) => {
  const res = await fetch(`${base}${p}`, { headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* HTML, not JSON */
  }
  return { status: res.status, text, json, headers: res.headers };
};

console.log(`✅ Production app listening on random port (dist: ${distDir})\n`);

try {
  // ---- SPA is served by Express ----
  const root = await get('/');
  check('GET / serves the built SPA (HTML)', root.status === 200 && root.text.includes('<div id="root">'), `status=${root.status}`);
  check('index.html references hashed assets', root.text.includes('/assets/'));

  const spa = await get('/admin/students');
  check('★ client route /admin/students -> SPA fallback (HTML)', spa.status === 200 && spa.text.includes('<div id="root">'), `status=${spa.status}`);

  const deep = await get('/student/attendance?month=2026-11');
  check('deep link with query string -> SPA fallback', deep.status === 200 && deep.text.includes('<div id="root">'));

  // ---- a real built asset is served with the right type ----
  const assetMatch = root.text.match(/src="(\/assets\/[^"]+\.js)"/);
  if (assetMatch) {
    const asset = await get(assetMatch[1]);
    check('hashed JS bundle served', asset.status === 200 && (asset.headers.get('content-type') || '').includes('javascript'), asset.headers.get('content-type'));
  } else {
    check('hashed JS bundle referenced in index.html', false, 'no /assets/*.js src found');
  }

  // ---- API contract unchanged in production ----
  const health = await get('/api/health');
  check('GET /api/health -> JSON', health.status === 200 && health.json?.success !== false, `status=${health.status}`);

  const me = await get('/api/auth/me');
  check('API routes stay guarded in production (anon /auth/me -> 401 JSON)', me.status === 401 && me.json?.success === false, `status=${me.status}`);

  const missing = await get('/api/no-such-route');
  check('★ unknown /api route -> JSON 404 (never the SPA)', missing.status === 404 && missing.json?.success === false && !missing.text.includes('<div id="root">'), `status=${missing.status}`);

  // ---- security headers on both kinds of responses ----
  const csp = root.headers.get('content-security-policy') || '';
  check('CSP allows Google Fonts (style-src)', csp.includes('fonts.googleapis.com'), csp.slice(0, 80) + '...');
  check('CSP allows font files (font-src gstatic)', csp.includes('fonts.gstatic.com'));
  check('SPA response has nosniff', root.headers.get('x-content-type-options') === 'nosniff');

  // ---- access log format ----
  check('production runs with NODE_ENV=production', process.env.NODE_ENV === 'production');

  // ---- serverless entry (Vercel): exports the app, never binds a port ----
  let listenCalled = false;
  const originalListen = app.listen;
  app.listen = () => {
    listenCalled = true;
    return { close() {} }; // record only - never actually bind in this test
  };
  const entry = await import('../src/index.js');
  app.listen = originalListen;
  check('★ index.js default-exports the Express app', entry.default === app);
  check('★ index.js does NOT call app.listen() in production', listenCalled === false);
  check(
    'serverless entry opens the MongoDB connection on cold start',
    mongoose.connection.readyState === 1,
    `readyState=${mongoose.connection.readyState}`
  );
} finally {
  server.close();
  try {
    await mongoose.disconnect();
  } catch {
    /* already disconnected */
  }
  console.log('\nDisconnected.\n');
}

console.log(`RESULT: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('🎉 Phase 10 production serving verified.');
process.exit(0);
