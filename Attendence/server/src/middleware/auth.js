import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { ApiError } from './error.js';

/** Sign a JWT carrying the user id + role. */
export const generateToken = (userId, role) =>
  jwt.sign({ id: String(userId), role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

/**
 * Requires a valid Bearer token; attaches `req.user`.
 * Usage: router.get('/me', requireAuth, controller)
 */
export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Authentication required. Please log in.');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new ApiError(401, 'Session expired or invalid. Please log in again.');
    }

    const user = await User.findById(payload.id);
    if (!user) throw new ApiError(401, 'Account no longer exists.');
    if (!user.isActive) throw new ApiError(403, 'This account has been deactivated.');

    req.user = {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      teacher: user.teacher,
      student: user.student,
    };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role guard. MUST run after requireAuth.
 * Usage: router.post('/students', requireAuth, requireRole('admin'), controller)
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
