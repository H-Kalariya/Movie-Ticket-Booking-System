import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

export function notFound(_req, _res, next) {
  next(ApiError.notFound('Route not found.'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';

  // Mongo duplicate key -> 409 conflict with a friendly message.
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `That ${field} is already in use.`;
  }
  // Mongoose validation errors -> 400.
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Validation failed.';
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier.';
  }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    error: message,
    ...(err.details && !isProd ? { details: err.details } : {}),
  });
}
