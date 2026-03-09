const logger = require('../services/logger');

/**
 * Global error handling middleware
 * Should be registered last in middleware stack
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
  });

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message || 'Validation failed';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Unauthorized access';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = err.message || 'Resource not found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = err.message || 'Resource conflict';
  } else if (err.statusCode) {
    // Custom error with status code
    statusCode = err.statusCode;
    errorCode = err.code || 'ERROR';
    message = err.message;
  }

  // Response object
  const response = {
    status: 'error',
    message,
    code: errorCode,
    timestamp: new Date().toISOString(),
  };

  // Add additional details in development
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      error: err.message,
      stack: err.stack,
    };
  }

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found middleware
 * Should be registered after all other routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';

  next(error);
};

/**
 * Request validation error handler
 * Formats express-validator errors
 */
const validationErrorHandler = (errors) => {
  const formattedErrors = {};

  errors.array().forEach((error) => {
    const field = error.param || 'unknown';
    if (!formattedErrors[field]) {
      formattedErrors[field] = [];
    }
    formattedErrors[field].push({
      message: error.msg,
      value: error.value,
    });
  });

  const error = new Error('Validation failed');
  error.name = 'ValidationError';
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.details = formattedErrors;

  return error;
};

/**
 * Safe JSON response builder
 * Ensures consistent response format
 */
const sendSuccess = (res, data = {}, statusCode = 200, message = 'Success') => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Safe error response builder
 * Ensures consistent error response format
 */
const sendError = (res, message = 'Error', statusCode = 500, code = 'ERROR', details = {}) => {
  res.status(statusCode).json({
    status: 'error',
    message,
    code,
    details: process.env.NODE_ENV === 'development' ? details : {},
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validationErrorHandler,
  sendSuccess,
  sendError,
};
