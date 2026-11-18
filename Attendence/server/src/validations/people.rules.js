import { body } from 'express-validator';

const id = (field, label) => body(field).isMongoId().withMessage(`Invalid ${label || field}`);

const email = (optional = false) => {
  const chain = body('email');
  return (optional ? chain.optional({ values: 'falsy' }) : chain)
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail();
};

const password = (optional = false) => {
  const chain = body('password');
  return (optional ? chain.optional({ values: 'falsy' }) : chain)
    .isString().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters');
};

// ---------- Student ----------
export const studentCreateRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 120 }),
  email(),
  password(),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required').isLength({ max: 30 }),
  body('enrollmentNumber').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('phone').optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
  body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']),
  body('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date of birth'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('guardianName').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  id('department', 'department'),
  id('course', 'course'),
  id('semester', 'semester'),
  id('class', 'class'),
  body('academicYear').matches(/^\d{4}-\d{4}$/).withMessage('Academic year must look like 2025-2026'),
  body('admissionDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid admission date'),
];

export const studentUpdateRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 120 }),
  email(true),
  password(true),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required').isLength({ max: 30 }),
  body('enrollmentNumber').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('phone').optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
  body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']),
  body('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date of birth'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('guardianName').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  id('department', 'department'),
  id('course', 'course'),
  id('semester', 'semester'),
  id('class', 'class'),
  body('academicYear').matches(/^\d{4}-\d{4}$/).withMessage('Academic year must look like 2025-2026'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true/false'),
];

// ---------- Teacher ----------
export const teacherCreateRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 120 }),
  email(),
  password(),
  body('employeeId').trim().notEmpty().withMessage('Employee ID is required').isLength({ max: 30 }),
  body('phone').optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
  body('department').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid department'),
  body('qualification').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('subjects').optional({ values: 'falsy' }).isArray().withMessage('Subjects must be a list'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('joiningDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid joining date'),
];

export const teacherUpdateRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 120 }),
  email(true),
  password(true),
  body('employeeId').trim().notEmpty().withMessage('Employee ID is required').isLength({ max: 30 }),
  body('phone').optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number'),
  body('department').optional({ values: 'falsy', null: true }).isMongoId().withMessage('Invalid department'),
  body('qualification').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('subjects').optional({ values: 'falsy' }).isArray().withMessage('Subjects must be a list'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('isActive').optional().isBoolean().withMessage('isActive must be true/false'),
];
