import { rateLimit } from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Phase 9 hardening - per-IP rate limiting.
 * - globalLimiter: generous budget for the whole API (flood protection).
 * - loginLimiter: strict budget on FAILED credential attempts only, so
 *   legitimate users behind one NAT (successful logins) are never blocked.
 * - resetLimiter: budget on password-reset requests (token/mail flooding).
 * All three answer with the standard { success, message } envelope.
 */
const jsonHandler = (message) => (req, res, next, options) => {
  res.status(options.statusCode).json({ success: false, message });
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many requests - please slow down and try again later.'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.loginRateLimit,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many login attempts - please wait a few minutes before trying again.'),
});

export const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many password-reset requests - please wait a few minutes.'),
});
