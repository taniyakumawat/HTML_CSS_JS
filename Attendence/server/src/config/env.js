import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env regardless of the directory the process was started from
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_attendance',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Allowed frontend origin (CORS). Trailing slashes are stripped because
  // browsers never send one in the Origin header (e.g. a CLIENT_URL of
  // 'https://x.vercel.app/' must still match Origin: 'https://x.vercel.app').
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, ''),
  // Set true when running behind a reverse proxy (nginx, etc.) so
  // rate-limiting sees the real client IP from X-Forwarded-For.
  trustProxy: process.env.TRUST_PROXY === 'true',
  // Failed-login budget per IP per 15 minutes (Phase 9 brute-force guard).
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT) || 20,
};

// Fail fast in production when a required secret is missing
if (env.nodeEnv === 'production' && !env.jwtSecret) {
  throw new Error('JWT_SECRET is required in production environment');
}

export default env;
