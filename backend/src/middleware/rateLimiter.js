const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { logger } = require('../services');

/**
 * Rate limiting configuration for different API endpoints
 */

// General API rate limiter (100 requests per 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Strict limiter for auth endpoints (5 requests per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Deployment creation limiter (10 deployments per hour per user)
const deploymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each user to 10 deployment creations per hour
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP with proper IPv6 handling
    return req.user?.id?.toString() || ipKeyGenerator(req);
  },
  message: {
    error: 'Too many deployments created, please try again later.',
    retryAfter: '1 hour',
  },
  handler: (req, res) => {
    logger.warn('Deployment rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many deployments created, please try again later.',
      retryAfter: '1 hour',
    });
  },
});

// API key validation limiter (stricter for credential operations)
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit credential operations
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP with proper IPv6 handling
    return req.user?.id?.toString() || ipKeyGenerator(req);
  },
  message: {
    error: 'Too many credential operations, please try again later.',
    retryAfter: '15 minutes',
  },
  handler: (req, res) => {
    logger.warn('Credential rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many credential operations, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// File upload limiter (stricter for large payloads)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit uploads
  message: {
    error: 'Too many uploads, please try again later.',
    retryAfter: '1 hour',
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  deploymentLimiter,
  credentialLimiter,
  uploadLimiter,
};
