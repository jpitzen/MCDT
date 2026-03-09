const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, AdConfiguration, AuditLog } = require('../models');
const { authService, ldapService, logger } = require('../services');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { passwordStrength } = require('../middleware/passwordStrength');
const { checkAccountLock, recordFailedAttempt, recordSuccessfulLogin } = require('../middleware/accountLockout');

const router = express.Router();

/**
 * POST /api/auth/login
 * User login with email and password
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  checkAccountLock,
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { email, password } = req.body;

    try {
      // Find user by email
      const user = await User.findOne({ where: { email } });

      if (!user || !user.isActive) {
        recordFailedAttempt(email);
        logger.security('Login attempt with invalid credentials', 'warn', { email });
        return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Verify password
      const isPasswordValid = await authService.comparePassword(password, user.passwordHash);

      if (!isPasswordValid) {
        recordFailedAttempt(email);
        logger.security('Login attempt with wrong password', 'warn', { email });
        return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Successful login — clear lockout counter
      recordSuccessfulLogin(email);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate auth tokens
      const authContext = authService.createAuthContext(user);

      logger.info(`User logged in: ${email}`, { userId: user.id });

      sendSuccess(
        res,
        {
          token: authContext.token,
          refreshToken: authContext.refreshToken,
          tokenType: authContext.tokenType,
          user: user.toSafeJSON(),
        },
        200,
        'Login successful'
      );
    } catch (error) {
      logger.error('Login error', error);
      sendError(res, 'Login failed', 500, 'LOGIN_ERROR');
    }
  })
);

/**
 * POST /api/auth/register
 * User registration (admin only)
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    passwordStrength('password'),
    body('firstName').isLength({ min: 1 }),
    body('lastName').isLength({ min: 1 }),
    body('role').isIn(['admin', 'operator', 'viewer', 'approver']),
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { email, password, firstName, lastName, role } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });

      if (existingUser) {
        return sendError(res, 'User already exists', 409, 'USER_EXISTS');
      }

      // Create new user
      const newUser = await User.create({
        email,
        firstName,
        lastName,
        role,
        passwordHash: password, // Will be hashed by the model hook
        isActive: true,
      });

      logger.info(`New user registered: ${email}`, {
        userId: newUser.id,
        role: newUser.role,
      });

      // Generate auth tokens for automatic login after registration
      const authContext = authService.createAuthContext(newUser);

      sendSuccess(
        res,
        {
          token: authContext.token,
          refreshToken: authContext.refreshToken,
          tokenType: authContext.tokenType,
          user: newUser.toSafeJSON(),
        },
        201,
        'User registered successfully'
      );
    } catch (error) {
      logger.error('Registration error', error);
      sendError(res, 'Registration failed', 500, 'REGISTRATION_ERROR');
    }
  })
);

/**
 * GET /api/auth/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    sendSuccess(
      res,
      {
        user: user.toSafeJSON(),
      },
      200,
      'Profile retrieved'
    );
  } catch (error) {
    logger.error('Profile retrieval error', error);
    sendError(res, 'Failed to get profile', 500, 'PROFILE_ERROR');
  }
}));

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().isLength({ min: 1 }),
    body('lastName').optional().isLength({ min: 1 }),
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      }

      // Update fields
      if (req.body.firstName) user.firstName = req.body.firstName;
      if (req.body.lastName) user.lastName = req.body.lastName;

      // Update theme preferences
      if (req.body.themePreferences !== undefined) {
        const tp = req.body.themePreferences;
        if (tp === null) {
          user.themePreferences = null;
        } else if (typeof tp === 'object' && !Array.isArray(tp)) {
          // Validate mode
          if (tp.mode && !User.VALID_THEME_MODES.includes(tp.mode)) {
            return sendError(res, 'Invalid theme mode', 400, 'INVALID_THEME_MODE');
          }
          // Validate presetKey
          if (tp.presetKey && !User.VALID_THEME_PRESETS.includes(tp.presetKey)) {
            return sendError(res, 'Invalid theme preset', 400, 'INVALID_THEME_PRESET');
          }
          // Validate hex colors if present
          const hexPattern = /^#[0-9a-fA-F]{6}$/;
          for (const field of ['customPrimary', 'customSecondary', 'customHeaderBg']) {
            if (tp[field] && !hexPattern.test(tp[field])) {
              return sendError(res, `Invalid hex color for ${field}`, 400, 'INVALID_COLOR');
            }
          }
          user.themePreferences = {
            mode: tp.mode || 'system',
            presetKey: tp.presetKey || 'ocean-blue',
            customPrimary: tp.customPrimary || null,
            customSecondary: tp.customSecondary || null,
            customHeaderBg: tp.customHeaderBg || null,
          };
        }
      }

      await user.save();

      logger.info(`User profile updated: ${user.email}`, { userId: user.id });

      sendSuccess(
        res,
        {
          user: user.toSafeJSON(),
        },
        200,
        'Profile updated'
      );
    } catch (error) {
      logger.error('Profile update error', error);
      sendError(res, 'Failed to update profile', 500, 'PROFILE_ERROR');
    }
  })
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').isLength({ min: 6 }),
    passwordStrength('newPassword'),
  ],
  asyncHandler(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isValid = await authService.comparePassword(currentPassword, user.passwordHash);

      if (!isValid) {
        return sendError(res, 'Current password is incorrect', 401, 'INVALID_PASSWORD');
      }

      // Update password
      user.passwordHash = newPassword;
      await user.save();

      logger.info(`User changed password: ${user.email}`, { userId: user.id });

      sendSuccess(res, {}, 200, 'Password changed successfully');
    } catch (error) {
      logger.error('Password change error', error);
      sendError(res, 'Failed to change password', 500, 'PASSWORD_ERROR');
    }
  })
);

/**
 * POST /api/auth/logout
 * User logout (optional - token is stateless)
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  logger.info(`User logged out: ${req.user.email}`, { userId: req.user.id });
  sendSuccess(res, {}, 200, 'Logged out successfully');
}));

// ════════════════════════════════════════════════════════════
//  AD / LDAP Authentication Endpoints
// ════════════════════════════════════════════════════════════

/**
 * POST /api/auth/ad-login
 * Authenticate via Active Directory / LDAP
 */
router.post(
  '/ad-login',
  [
    body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { username, password } = req.body;

    try {
      // Check if AD is configured
      const activeConfig = await ldapService.getActiveConfig();
      if (!activeConfig) {
        logger.security('AD login attempt but no active config', 'warn', { username });
        return sendError(res, 'AD/LDAP authentication is not configured', 400, 'AD_NOT_CONFIGURED');
      }

      // Check account lockout (keyed by username for AD)
      const lockoutKey = `ad:${username.toLowerCase()}`;
      // We call recordFailedAttempt / recordSuccessfulLogin directly
      // because checkAccountLock middleware reads req.body.email

      // Authenticate via AD
      const result = await authService.authenticateWithAd(username, password);

      // Check if user is active
      if (!result.user.isActive) {
        logger.security('AD login attempt for disabled account', 'warn', { username });
        return sendError(res, 'Account is disabled', 403, 'ACCOUNT_DISABLED');
      }

      // Success — clear lockout counter
      recordSuccessfulLogin(lockoutKey);

      // Audit log
      try {
        await AuditLog.create({
          userId: result.user.id,
          action: 'ad_login.success',
          resourceType: 'auth',
          resourceId: result.user.id,
          resourceName: username,
          actionStatus: 'success',
          changes: { authProvider: result.user.authProvider, role: result.user.role },
          ipAddress: req.ip,
        });
      } catch (_) { /* non-fatal */ }

      logger.security('AD login succeeded', 'info', { username, userId: result.user.id });

      sendSuccess(
        res,
        {
          token: result.token,
          refreshToken: result.refreshToken,
          tokenType: result.tokenType,
          user: result.user.toSafeJSON(),
        },
        200,
        'AD login successful'
      );
    } catch (error) {
      // Increment lockout counter
      const lockoutKey = `ad:${username.toLowerCase()}`;
      recordFailedAttempt(lockoutKey);

      // Determine error code
      let code = 'AD_AUTH_FAILED';
      let status = 401;
      if (error.message && error.message.includes('not configured')) {
        code = 'AD_NOT_CONFIGURED';
        status = 400;
      } else if (error.message && error.message.includes('Connection')) {
        code = 'AD_CONNECTION_ERROR';
        status = 502;
      }

      // Audit log
      try {
        await AuditLog.create({
          userId: null,
          action: 'ad_login.failure',
          resourceType: 'auth',
          resourceName: username,
          actionStatus: 'failure',
          errorMessage: error.message,
          ipAddress: req.ip,
        });
      } catch (_) { /* non-fatal */ }

      logger.security('AD login failed', 'warn', { username, error: error.message });
      sendError(res, 'AD authentication failed', status, code);
    }
  })
);

/**
 * POST /api/auth/refresh
 * Issue new access + refresh token from a valid refresh token (token rotation)
 */
router.post(
  '/refresh',
  [
    body('refreshToken').isLength({ min: 1 }).withMessage('Refresh token is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { refreshToken } = req.body;

    try {
      // Verify refresh token
      const decoded = authService.verifyToken(refreshToken);

      // Must be a refresh-type token
      if (decoded.type !== 'refresh') {
        return sendError(res, 'Invalid token type', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Look up user
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      }
      if (!user.isActive) {
        return sendError(res, 'Account is disabled', 403, 'ACCOUNT_DISABLED');
      }

      // Generate new token pair (rotation)
      const authContext = authService.createAuthContext(user);

      sendSuccess(
        res,
        {
          token: authContext.token,
          refreshToken: authContext.refreshToken,
          tokenType: authContext.tokenType,
        },
        200,
        'Token refreshed'
      );
    } catch (error) {
      if (error.message === 'Token has expired') {
        return sendError(res, 'Refresh token has expired', 401, 'TOKEN_EXPIRED');
      }
      return sendError(res, 'Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  })
);

/**
 * GET /api/auth/ldap-status
 * Public endpoint — check whether AD/LDAP login is available.
 */
router.get(
  '/ldap-status',
  asyncHandler(async (_req, res) => {
    try {
      const config = await ldapService.getActiveConfig();
      if (config) {
        sendSuccess(res, { configured: true, serverName: config.name }, 200, 'LDAP status');
      } else {
        sendSuccess(res, { configured: false }, 200, 'LDAP status');
      }
    } catch (error) {
      logger.error('LDAP status check error', error);
      sendSuccess(res, { configured: false }, 200, 'LDAP status');
    }
  })
);

module.exports = router;
