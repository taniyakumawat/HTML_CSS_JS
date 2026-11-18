import { body } from 'express-validator';
import { DAYS_OF_WEEK } from '../models/Timetable.js';

const id = (field, label) =>
  body(field).isMongoId().withMessage(`Invalid ${label || field}`);

const optionalId = (field, label) =>
  body(field).optional({ values: 'falsy' }).isMongoId().withMessage(`Invalid ${label || field}`);

// ---------- Department ----------
export const departmentRules = [
  body('name').trim().notEmpty().withMessage('Department name is required')
    .isLength({ max: 100 }),
  body('code').trim().notEmpty().withMessage('Department code is required')
    .isLength({ max: 20 }).withMessage('Code cannot exceed 20 characters'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  optionalId('head', 'head teacher'),
];

// ---------- Course ----------
export const courseRules = [
  body('name').trim().notEmpty().withMessage('Course name is required').isLength({ max: 150 }),
  body('code').trim().notEmpty().withMessage('Course code is required').isLength({ max: 30 }),
  id('department', 'department'),
  body('durationYears').optional({ values: 'falsy' })
    .isInt({ min: 1, max: 8 }).withMessage('Duration must be 1-8 years'),
  body('totalSemesters').optional({ values: 'falsy' })
    .isInt({ min: 1, max: 24 }).withMessage('Semesters must be 1-24'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
];

// ---------- Semester ----------
export const semesterRules = [
  id('course', 'course'),
  body('number').isInt({ min: 1, max: 24 }).withMessage('Semester number must be 1-24'),
  body('year').isInt({ min: 1, max: 8 }).withMessage('Year must be 1-8'),
  body('name').trim().notEmpty().withMessage('Semester name is required').isLength({ max: 60 }),
  body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid start date'),
  body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid end date'),
];

// ---------- Subject ----------
export const subjectRules = [
  body('name').trim().notEmpty().withMessage('Subject name is required').isLength({ max: 120 }),
  body('code').trim().notEmpty().withMessage('Subject code is required').isLength({ max: 30 }),
  id('course', 'course'),
  id('semester', 'semester'),
  body('credits').optional({ values: 'falsy' })
    .isInt({ min: 0, max: 10 }).withMessage('Credits must be 0-10'),
  body('type').optional({ values: 'falsy' })
    .isIn(['theory', 'practical', 'elective']).withMessage('Invalid subject type'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
];

// ---------- Class ----------
export const classRules = [
  body('name').trim().notEmpty().withMessage('Class name is required').isLength({ max: 60 }),
  id('course', 'course'),
  id('semester', 'semester'),
  body('section').optional({ values: 'falsy' }).trim().isLength({ max: 10 }),
  body('academicYear')
    .matches(/^\d{4}-\d{4}$/).withMessage('Academic year must look like 2025-2026'),
  optionalId('classTeacher', 'class teacher'),
  body('room').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('teachingAssignments').optional({ values: 'falsy' }).isArray().withMessage('Assignments must be a list'),
  body('teachingAssignments.*.subject').optional({ values: 'falsy' }).isMongoId(),
  body('teachingAssignments.*.teacher').optional({ values: 'falsy' }).isMongoId(),
];

// ---------- Timetable ----------
export const timetableRules = [
  id('class', 'class'),
  body('day').isIn(DAYS_OF_WEEK).withMessage('Invalid day of week'),
  body('periodNumber').isInt({ min: 1, max: 15 }).withMessage('Period must be 1-15'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Start time must be HH:mm'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('End time must be HH:mm'),
  id('subject', 'subject'),
  id('teacher', 'teacher'),
  body('room').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('academicYear').optional({ values: 'falsy' })
    .matches(/^\d{4}-\d{4}$/).withMessage('Academic year must look like 2025-2026'),
];
