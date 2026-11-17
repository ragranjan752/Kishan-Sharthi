// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Centralized Error Handling Middleware
//  Catches all thrown errors and formats them consistently.
// ═══════════════════════════════════════════════════════

const logger = require('../config/logger');
const { sendError } = require('../utils/response');

/**
 * Custom application error class.
 * Use this to throw structured errors from anywhere in the app.
 *
 * Example:
 *   throw new AppError('Farmer not found', 404, 'FARMER_NOT_FOUND');
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // expected/handled error
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async wrapper — eliminates try/catch boilerplate in route handlers.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware.
 * Must be registered AFTER all routes.
 */
function globalErrorHandler(err, req, res, next) {
  // Operational errors (expected, structured)
  if (err.isOperational) {
    logger.warn({ err, path: req.path, method: req.method }, 'Operational error');
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Zod validation errors (Zod v4 exposes `issues`; v3 used `errors`)
  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    const details = issues.map((e) => ({
      field: (e.path || []).join('.'),
      message: e.message,
    }));
    logger.warn({ details, path: req.path }, 'Validation error');
    return sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token expired', 401, 'TOKEN_EXPIRED');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File size exceeds limit', 400, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 'Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  // Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    logger.error({ err, path: req.path }, 'Supabase/PostgREST error');
    if (err.code === 'PGRST116') {
      return sendError(res, 'Resource not found', 404, 'NOT_FOUND');
    }
    return sendError(res, 'Database error', 500, 'DB_ERROR');
  }

  // Unexpected errors — log fully, return generic message
  logger.error({ err, path: req.path, method: req.method, body: req.body }, 'Unhandled error');

  const isDev = process.env.NODE_ENV === 'development';
  return sendError(
    res,
    isDev ? err.message : 'An unexpected error occurred',
    500,
    'INTERNAL_ERROR',
    isDev ? { stack: err.stack } : null
  );
}

/**
 * 404 handler for unmatched API routes.
 */
function notFoundHandler(req, res) {
  if (req.path.startsWith('/api')) {
    return sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
  }
  // For non-API routes, serve the SPA
  res.sendFile(require('path').resolve(__dirname, '../../../frontend/index.html'));
}

module.exports = { AppError, asyncHandler, globalErrorHandler, notFoundHandler };

