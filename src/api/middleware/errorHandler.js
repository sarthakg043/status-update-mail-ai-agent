/**
 * Standard error response helper & Express error-handling middleware.
 */

class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Wrap an async route handler so thrown errors are forwarded to Express error handler.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Central error-handling middleware — must be registered last.
 */
function errorHandler(err, _req, res, _next) {
  console.error('[API Error]', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Mongoose / MongoDB duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE', message: 'Resource already exists.' },
    });
  }

  // Fall-through: unexpected error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
    },
  });
}

module.exports = { AppError, asyncHandler, errorHandler };
