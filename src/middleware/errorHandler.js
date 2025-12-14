const logger = require('../utils/logger');
const config = require('../config');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found middleware
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Resource not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.userId,
    });
  } else {
    logger.warn('Client Error:', {
      error: err.message,
      path: req.path,
      method: req.method,
      userId: req.userId,
    });
  }

  // Handle specific error types
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Resource already exists';
    details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference to related resource';
  }

  // Response
  const response = {
    success: false,
    error: message,
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development
  if (config.server.env === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  notFound,
  errorHandler,
  asyncHandler,
};

