import crypto from 'crypto';
import User from '../models/User.js';
import env from '../config/env.js';
import { ApiError } from '../middleware/error.js';
import { generateToken } from '../middleware/auth.js';

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

/**
 * POST /api/auth/login
 * Body: { email, password }  ->  { token, user }
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
    // Same message for wrong email OR password (no user enumeration)
    if (!user) throw new ApiError(401, 'Invalid email or password');
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact the administrator.');
    }

    const passwordOk = await user.comparePassword(password);
    if (!passwordOk) throw new ApiError(401, 'Invalid email or password');

    user.lastLoginAt = new Date();
    await user.save(); // password unchanged -> no re-hash

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: { token, user: user.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register   (ADMIN ONLY - enforced by requireRole)
 * Body: { name, email, password, role? }
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student' } = req.body;

    const existing = await User.findOne({ email: normalizeEmail(email) });
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      data: { user: user.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me  ->  current user + populated profile
 */
export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({ path: 'teacher', select: 'employeeId name department' })
      .populate({ path: 'student', select: 'rollNumber name class course semester department academicYear' });

    if (!user) throw new ApiError(404, 'User account not found');

    res.status(200).json({ success: true, data: { user: user.toJSON() } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new ApiError(404, 'User account not found');

    const ok = await user.comparePassword(currentPassword);
    if (!ok) throw new ApiError(401, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Always answers 200 (prevents email enumeration). In development the
 * reset token is returned in the response; in production an email is sent
 * (SMTP integration happens in the deployment phase).
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const payload = {
      success: true,
      message: 'If that email exists, a password reset link has been sent.',
    };

    const user = await User.findOne({ email });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await user.save({ validateBeforeSave: false });

      if (env.nodeEnv !== 'production') {
        payload.data = { resetToken }; // DEV ONLY - replace with email in production
      }
      // TODO(email): send resetToken to user via SMTP
    }

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const hashed = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) throw new ApiError(400, 'Reset token is invalid or has expired');

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
