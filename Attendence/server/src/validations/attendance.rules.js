import { body } from 'express-validator';
import { ATTENDANCE_STATUSES } from '../models/Attendance.js';

/** Shared rules for the records payload (used by both mark & correct). */
const recordRules = [
  body('records').isArray({ min: 1 }).withMessage('Attendance records must be a non-empty list'),
  body('records.*.student').isMongoId().withMessage('Invalid student in records'),
  body('records.*.status')
    .isIn(ATTENDANCE_STATUSES)
    .withMessage(`Status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`),
  body('records.*.note').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
];

/** POST /api/attendance - mark a new session. */
export const markAttendanceRules = [
  body('class').isMongoId().withMessage('Invalid class'),
  body('subject').isMongoId().withMessage('Invalid subject'),
  body('date').isISO8601().withMessage('Invalid date').toDate(),
  body('periodNumber').optional({ values: 'falsy' }).isInt({ min: 1, max: 15 }),
  ...recordRules,
];

/** PUT /api/attendance/:id - authorized correction (reason required for audit). */
export const updateAttendanceRules = [
  ...recordRules,
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('A reason is required to correct attendance')
    .isLength({ max: 500 }),
];
