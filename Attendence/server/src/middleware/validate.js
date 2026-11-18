import { validationResult } from 'express-validator';

/**
 * Runs express-validator rules and returns a consistent 400 on failure.
 * Usage: router.post('/login', validate(loginRules), controller)
 *
 * @param {import('express-validator').ValidationChain[]} rules
 */
export const validate = (rules = []) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }
    next();
  },
];
