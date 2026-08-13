import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const error = err instanceof ApiError ? err : new ApiError(500, 'Internal server error');
  if (error.status >= 500) {
    console.error('[syncspace] unhandled error:', err);
  }
  res.status(error.status).json({
    success: false,
    error: { message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) },
  });
};