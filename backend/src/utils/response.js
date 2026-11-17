// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Centralized API Response Helpers
//  Consistent envelope for all API responses.
// ═══════════════════════════════════════════════════════

/**
 * Send a successful response.
 * @param {object} res - Express response
 * @param {any} data - Response payload
 * @param {string} message - Optional human-readable message
 * @param {number} statusCode - HTTP status code (default 200)
 */
function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  const payload = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
}

/**
 * Send a created response (201).
 */
function sendCreated(res, data, message = 'Created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send a paginated list response.
 */
function sendPaginated(res, items, total, page, limit, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

/**
 * Send an error response.
 * @param {object} res - Express response
 * @param {string} message - Error message (safe for client)
 * @param {number} statusCode - HTTP status code
 * @param {string|null} code - Machine-readable error code
 * @param {object|null} details - Validation details etc.
 */
function sendError(res, message, statusCode = 500, code = null, details = null) {
  const payload = {
    success: false,
    error: message,
  };

  if (code) payload.code = code;
  if (details) payload.details = details;

  return res.status(statusCode).json(payload);
}

/**
 * Common error shortcuts
 */
const errors = {
  badRequest: (res, message, details = null) =>
    sendError(res, message, 400, 'BAD_REQUEST', details),
  unauthorized: (res, message = 'Authentication required') =>
    sendError(res, message, 401, 'UNAUTHORIZED'),
  forbidden: (res, message = 'Access denied') =>
    sendError(res, message, 403, 'FORBIDDEN'),
  notFound: (res, resource = 'Resource') =>
    sendError(res, `${resource} not found`, 404, 'NOT_FOUND'),
  conflict: (res, message) =>
    sendError(res, message, 409, 'CONFLICT'),
  unprocessable: (res, message, details = null) =>
    sendError(res, message, 422, 'UNPROCESSABLE', details),
  internal: (res, message = 'Internal server error') =>
    sendError(res, message, 500, 'INTERNAL_ERROR'),
  serviceUnavailable: (res, message = 'Service temporarily unavailable') =>
    sendError(res, message, 503, 'SERVICE_UNAVAILABLE'),
};

module.exports = { sendSuccess, sendCreated, sendPaginated, sendError, errors };

