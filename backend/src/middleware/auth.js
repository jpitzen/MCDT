const { authService } = require('../services');
const logger = require('../services/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Missing authorization header',
        code: 'MISSING_AUTH_HEADER',
      });
    }

    const token = authService.extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authorization header format',
        code: 'INVALID_AUTH_FORMAT',
      });
    }

    const decoded = authService.verifyToken(token);

    // Validate token claims
    if (!authService.validateTokenClaims(decoded)) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token claims',
        code: 'INVALID_TOKEN_CLAIMS',
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    // Log authentication
    logger.debug('User authenticated', {
      userId: req.user.id,
      email: req.user.email,
    });

    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    logger.error('Authentication middleware error', error);

    res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Authorization middleware - check user role
 * @param {array} allowedRoles - Roles allowed to access endpoint
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.security('Unauthorized access attempt', 'warn', {
        userId: req.user.id,
        role: req.user.role,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        status: 'error',
        message: 'User does not have permission to access this resource',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if token is missing
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
      return next();
    }

    const token = authService.extractToken(authHeader);

    if (!token) {
      return next();
    }

    const decoded = authService.verifyToken(token);

    if (authService.validateTokenClaims(decoded)) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Log but don't fail
    logger.debug('Optional authentication failed', { error: error.message });
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
