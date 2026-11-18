import { body } from 'express-validator';

const emailRule = body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Please provide a valid email address')
  .normalizeEmail();

const passwordRule = body('password')
  .isString().withMessage('Password is required')
  .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  .trim();

/** POST /api/auth/login */
export const loginRules = [
  emailRule,
  body('password').notEmpty().withMessage('Password is required'),
];

/** POST /api/auth/register (admin only) */
export const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  emailRule,
  passwordRule,
  body('role')
    .optional()
    .isIn(['admin', 'teacher', 'student']).withMessage('Role must be admin, teacher or student'),
];

/** POST /api/auth/change-password */
export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

/** POST /api/auth/forgot-password */
export const forgotPasswordRules = [emailRule];

/** POST /api/auth/reset-password */
export const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];
