import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Register ALL 12 Mongoose models on startup so populate() can resolve
// any ref (Teacher, Student, Class, ...) regardless of which route runs first.
import './models/index.js';
import env from './config/env.js';
import routes from './routes/index.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { sanitizeQuery } from './middleware/sanitizeQuery.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Behind a reverse proxy (Phase 10) trust X-Forwarded-For for rate-limit keys
if (env.trustProxy) app.set('trust proxy', 1);

// ---------- CORS: FIRST middleware - before any route, auth or redirect logic ----------
// Explicit configuration so every preflight OPTIONS request is answered here
// (204, never a redirect) and never reaches routing. credentials: true
// requires echoing the exact origin (never '*').
const corsOptions = {
  origin: [
    'https://attendance-client.vercel.app', // production frontend (Vercel)
    'https://attendence-client.vercel.app', // alternate spelling (legacy)
    'http://localhost:5173', // local Vite dev server
    process.env.FRONTEND_URL, // optional extra deploy origin
    env.clientUrl, // CLIENT_URL from server/.env
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase().replace(/\/+$/, '')), // trim + no trailing slash
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Authorization header / cookies cross-origin
  optionsSuccessStatus: 204, // preflight success: 204 (or 200)
};

// Explicit preflight handler: OPTIONS -> immediate 204, no redirect possible.
app.options('*', cors(corsOptions));
// Actual requests get the CORS headers (unknown origins get no ACAO header).
app.use(cors(corsOptions));

// ---------- Global middleware ----------
// CSP: default helmet policy + the Google Fonts origins the SPA loads
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      },
    },
  })
);
// Reject object/array query params (NoSQL-injection guard) before any route
app.use(sanitizeQuery);
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// ---------- Built frontend (Phase 10: single-service production deploy) ----------
// In production Express serves client/dist, so ONE process hosts the whole app.
// In development Vite serves the SPA on :5173 and this block stays inactive.
const distDir = path.resolve(__dirname, '../../client/dist');
const hasBuiltClient = env.nodeEnv === 'production' && fs.existsSync(path.join(distDir, 'index.html'));

if (hasBuiltClient) {
  // redirect: false - static never issues 3xx (incl. any /api/* safety)
  app.use(express.static(distDir, { redirect: false }));
}

// ---------- Routes ----------
app.get('/', (req, res) => {
  if (hasBuiltClient) return res.sendFile(path.join(distDir, 'index.html'));
  res.json({
    success: true,
    message: 'Smart College Attendance API',
    docs: '/api/health',
  });
});

app.use('/api', routes);

// SPA fallback: any non-API GET returns the React app (client-side routing).
// /api/* skips this so unknown API routes keep their JSON 404 envelope.
if (hasBuiltClient) {
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    return next();
  });
}

// ---------- 404 & error handling ----------
app.use(notFound);
app.use(errorHandler);

export default app;
