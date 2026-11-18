/**
 * Centralized API error handling.
 * Throw an ApiError anywhere in controllers/services:
 *   throw new ApiError(404, 'Student not found');
 */

export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 handler for unknown routes
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Final error handler - formats a consistent JSON response
export const errorHandler = (err, req, res, next) => {
  // MongoDB duplicate key (unique indexes) -> 409
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {}).join(', ') || 'value';
    return res.status(409).json({
      success: false,
      message: `A record with this ${fields} already exists`,
    });
  }

  // Mongoose validation -> 400 with field details
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors || {}).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Bad ObjectId in a URL param -> 400
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for "${err.path}"`,
    });
  }

  const statusCode = err.statusCode || 500;
  // In production never leak internals (stack traces, driver messages) for
  // unexpected 500s - operational ApiErrors keep their intended message.
  const isProd = process.env.NODE_ENV === 'production';
  const message =
    statusCode >= 500 && isProd && !err.isOperational
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} ${message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors && err.errors.length ? err.errors : undefined,
  });
};
