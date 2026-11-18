import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter, resetLimiter } from '../middleware/rateLimit.js';
import {
  loginRules,
  registerRules,
  changePasswordRules,
  forgotPasswordRules,
  resetPasswordRules,
} from '../validations/auth.rules.js';

const router = Router();

// Public - strict per-IP budgets first (Phase 9 brute-force / token-flood guard)
router.post('/login', loginLimiter, validate(loginRules), authController.login);
router.post('/forgot-password', resetLimiter, validate(forgotPasswordRules), authController.forgotPassword);
router.post('/reset-password', resetLimiter, validate(resetPasswordRules), authController.resetPassword);

// Authenticated (any role)
router.get('/me', requireAuth, authController.me);
router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordRules),
  authController.changePassword
);

// Admin only - creates teacher/student/admin accounts
router.post(
  '/register',
  requireAuth,
  requireRole('admin'),
  validate(registerRules),
  authController.register
);

export default router;
