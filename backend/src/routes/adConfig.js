/**
 * AD Configuration Admin Routes
 *
 * All endpoints require authenticate + authorize(['admin']).
 * Mounted at /api/ad-config with credentialLimiter.
 */
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const adConfigService = require('../services/adConfigService');
const { logger } = require('../services');

// Role mapping sub-router (merged into this router below)
const adRoleMappingsRouter = require('./adRoleMappings');

const router = express.Router();

// Apply auth middleware to ALL routes
router.use(authenticate);
router.use(authorize(['admin']));

// ── Nest role-mapping routes under /:configId/role-mappings ──
router.use('/:configId/role-mappings', adRoleMappingsRouter);

// ════════════════════════════════════════════════════════════
//  Configuration CRUD
// ════════════════════════════════════════════════════════════

/**
 * GET /api/ad-config
 * List all AD configurations (bind password masked)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const configs = await adConfigService.listConfigs();
    sendSuccess(res, { configs }, 200, 'AD configurations retrieved');
  })
);

/**
 * POST /api/ad-config
 * Create a new AD configuration
 */
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('serverUrl')
      .trim()
      .isLength({ min: 1 })
      .matches(/^ldaps?:\/\//)
      .withMessage('Server URL must start with ldap:// or ldaps://'),
    body('baseDn').trim().isLength({ min: 1 }).withMessage('Base DN is required'),
    body('port')
      .optional()
      .isInt({ min: 1, max: 65535 })
      .withMessage('Port must be 1–65535'),
    body('bindDn')
      .trim()
      .isLength({ min: 1 })
      .contains('=')
      .withMessage('Bind DN is required and must be a valid DN format'),
    body('bindPassword')
      .isLength({ min: 1 })
      .withMessage('Bind password is required'),
    body('userSearchFilter')
      .trim()
      .isLength({ min: 1 })
      .contains('{username}')
      .withMessage('User search filter must contain {username} placeholder'),
    body('userSearchBase').optional().trim(),
    body('groupSearchFilter').optional().trim(),
    body('groupSearchBase').optional().trim(),
    body('emailAttribute').optional().trim().isLength({ min: 1, max: 100 }),
    body('displayNameAttribute').optional().trim().isLength({ min: 1, max: 100 }),
    body('firstNameAttribute').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastNameAttribute').optional().trim().isLength({ min: 1, max: 100 }),
    body('groupAttribute').optional().trim().isLength({ min: 1, max: 100 }),
    body('uniqueIdAttribute').optional().trim().isLength({ min: 1, max: 100 }),
    body('useSsl').optional().isBoolean(),
    body('connectionTimeout').optional().isInt({ min: 1000, max: 60000 }),
    body('autoCreateUsers').optional().isBoolean(),
    body('defaultRole').optional().isIn(['admin', 'approver', 'operator', 'viewer']),
    body('syncIntervalMinutes').optional().isInt({ min: 0 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const config = await adConfigService.createConfig(req.body, req.user.id);

      await adConfigService.audit(
        'ad_config.create', req.user.id, config.id, config.name,
        { serverUrl: config.serverUrl }, 'success', req
      );

      sendSuccess(res, { config }, 201, 'AD configuration created');
    } catch (error) {
      logger.error('Failed to create AD config', error);
      sendError(res, 'Failed to create AD configuration', 500, 'AD_CONFIG_CREATE_ERROR');
    }
  })
);

/**
 * GET /api/ad-config/:id
 * Get single AD configuration by ID
 */
router.get(
  '/:id',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid configuration ID', 400, 'VALIDATION_ERROR', errors.array());
    }

    const result = await adConfigService.getConfig(req.params.id);
    if (!result) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    sendSuccess(res, { config: result.safe }, 200, 'AD configuration retrieved');
  })
);

/**
 * PUT /api/ad-config/:id
 * Update an AD configuration
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('serverUrl')
      .optional()
      .trim()
      .matches(/^ldaps?:\/\//)
      .withMessage('Server URL must start with ldap:// or ldaps://'),
    body('baseDn').optional().trim().isLength({ min: 1 }),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('bindDn').optional().trim().isLength({ min: 1 }).contains('='),
    body('bindPassword').optional().isLength({ min: 1 }),
    body('userSearchFilter')
      .optional()
      .trim()
      .contains('{username}')
      .withMessage('User search filter must contain {username} placeholder'),
    body('useSsl').optional().isBoolean(),
    body('connectionTimeout').optional().isInt({ min: 1000, max: 60000 }),
    body('autoCreateUsers').optional().isBoolean(),
    body('defaultRole').optional().isIn(['admin', 'approver', 'operator', 'viewer']),
    body('syncIntervalMinutes').optional().isInt({ min: 0 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const config = await adConfigService.updateConfig(req.params.id, req.body);
      if (!config) {
        return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
      }

      // Log changed fields (exclude password)
      const changedFields = Object.keys(req.body).filter((k) => k !== 'bindPassword');
      await adConfigService.audit(
        'ad_config.update', req.user.id, config.id, config.name,
        { changedFields }, 'success', req
      );

      sendSuccess(res, { config }, 200, 'AD configuration updated');
    } catch (error) {
      logger.error('Failed to update AD config', error);
      sendError(res, 'Failed to update AD configuration', 500, 'AD_CONFIG_UPDATE_ERROR');
    }
  })
);

/**
 * DELETE /api/ad-config/:id
 * Delete an AD configuration (cascades role mappings)
 */
router.delete(
  '/:id',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid configuration ID', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const result = await adConfigService.deleteConfig(req.params.id);
      if (!result) {
        return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
      }

      await adConfigService.audit(
        'ad_config.delete', req.user.id, result.id, result.name,
        {}, 'success', req
      );

      sendSuccess(res, { deleted: result }, 200, 'AD configuration deleted');
    } catch (error) {
      logger.error('Failed to delete AD config', error);
      sendError(res, 'Failed to delete AD configuration', 500, 'AD_CONFIG_DELETE_ERROR');
    }
  })
);

// ════════════════════════════════════════════════════════════
//  Activation / Deactivation
// ════════════════════════════════════════════════════════════

/**
 * POST /api/ad-config/:id/activate
 */
router.post(
  '/:id/activate',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const config = await adConfigService.activateConfig(req.params.id);
    if (!config) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    await adConfigService.audit(
      'ad_config.activate', req.user.id, config.id, config.name,
      {}, 'success', req
    );

    sendSuccess(res, { config }, 200, 'AD configuration activated');
  })
);

/**
 * POST /api/ad-config/:id/deactivate
 */
router.post(
  '/:id/deactivate',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const config = await adConfigService.deactivateConfig(req.params.id);
    if (!config) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    await adConfigService.audit(
      'ad_config.deactivate', req.user.id, config.id, config.name,
      {}, 'success', req
    );

    sendSuccess(res, { config }, 200, 'AD configuration deactivated');
  })
);

// ════════════════════════════════════════════════════════════
//  Connection Testing
// ════════════════════════════════════════════════════════════

/**
 * POST /api/ad-config/:id/test-connection
 * Test LDAP connectivity with a stored configuration
 */
router.post(
  '/:id/test-connection',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const result = await adConfigService.testConnectionById(req.params.id);
    if (result === null) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    await adConfigService.audit(
      'ad_config.test_connection', req.user.id, req.params.id, null,
      { success: result.success, latencyMs: result.latencyMs }, result.success ? 'success' : 'failure', req
    );

    sendSuccess(res, result, 200, result.success ? 'Connection successful' : 'Connection failed');
  })
);

/**
 * POST /api/ad-config/test-connection
 * Test LDAP connectivity with ad-hoc config (for pre-save testing)
 */
router.post(
  '/test-connection',
  [
    body('serverUrl').trim().matches(/^ldaps?:\/\//).withMessage('Server URL required (ldap:// or ldaps://)'),
    body('baseDn').trim().isLength({ min: 1 }),
    body('bindDn').trim().isLength({ min: 1 }).contains('='),
    body('bindPassword').isLength({ min: 1 }),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('useSsl').optional().isBoolean(),
    body('connectionTimeout').optional().isInt({ min: 1000, max: 60000 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const result = await adConfigService.testConnectionAdHoc(req.body);

      await adConfigService.audit(
        'ad_config.test_connection', req.user.id, null, 'ad-hoc',
        { success: result.success, latencyMs: result.latencyMs }, result.success ? 'success' : 'failure', req
      );

      sendSuccess(res, result, 200, result.success ? 'Connection successful' : 'Connection failed');
    } catch (error) {
      logger.error('Ad-hoc connection test error', error);
      sendError(res, 'Connection test failed', 500, 'AD_CONNECTION_ERROR');
    }
  })
);

// ════════════════════════════════════════════════════════════
//  Service Account Management
// ════════════════════════════════════════════════════════════

/**
 * PUT /api/ad-config/:id/service-account
 * Update bind DN and password
 */
router.put(
  '/:id/service-account',
  [
    param('id').isUUID(),
    body('bindDn').trim().isLength({ min: 1 }).contains('=').withMessage('Bind DN required'),
    body('bindPassword').isLength({ min: 1 }).withMessage('Bind password required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const config = await adConfigService.updateServiceAccount(
      req.params.id, req.body.bindDn, req.body.bindPassword
    );
    if (!config) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    await adConfigService.audit(
      'ad_config.update_service_account', req.user.id, config.id, config.name,
      { bindDn: req.body.bindDn }, 'success', req
    );

    sendSuccess(res, { config }, 200, 'Service account updated');
  })
);

/**
 * POST /api/ad-config/:id/verify-service-account
 * Verify stored service account can bind
 */
router.post(
  '/:id/verify-service-account',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const result = await adConfigService.verifyServiceAccount(req.params.id);
    if (result === null) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    sendSuccess(res, result, 200, result.success ? 'Service account verified' : 'Verification failed');
  })
);

// ════════════════════════════════════════════════════════════
//  Group Browsing
// ════════════════════════════════════════════════════════════

/**
 * GET /api/ad-config/:id/groups
 * Search/list AD groups visible to the service account
 */
router.get(
  '/:id/groups',
  [
    param('id').isUUID(),
    query('search').optional().trim(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const groups = await adConfigService.searchGroups(
        req.params.id, req.query.search, req.query.limit || 50
      );
      if (groups === null) {
        return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
      }

      sendSuccess(res, { groups, count: groups.length }, 200, 'AD groups retrieved');
    } catch (error) {
      logger.error('Group search error', error);
      sendError(res, 'Failed to search AD groups', 500, 'AD_GROUP_SEARCH_ERROR');
    }
  })
);

/**
 * GET /api/ad-config/:id/groups/:groupDn/members
 * List members of a specific AD group
 */
router.get(
  '/:id/groups/:groupDn/members',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    try {
      const groupDn = decodeURIComponent(req.params.groupDn);
      const members = await adConfigService.getGroupMembers(req.params.id, groupDn);
      if (members === null) {
        return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
      }

      sendSuccess(res, { members, count: members.length }, 200, 'Group members retrieved');
    } catch (error) {
      logger.error('Group member lookup error', error);
      sendError(res, 'Failed to retrieve group members', 500, 'AD_GROUP_MEMBER_ERROR');
    }
  })
);

// ════════════════════════════════════════════════════════════
//  User Sync
// ════════════════════════════════════════════════════════════

/**
 * POST /api/ad-config/:id/sync
 * Trigger manual AD user sync
 */
router.post(
  '/:id/sync',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    try {
      const stats = await adConfigService.syncUsers(req.params.id);
      if (stats === null) {
        return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
      }

      await adConfigService.audit(
        'ad_sync.manual', req.user.id, req.params.id, null,
        stats, 'success', req
      );

      sendSuccess(res, stats, 200, 'AD user sync completed');
    } catch (error) {
      logger.error('AD sync error', error);
      sendError(res, 'AD sync failed', 500, 'AD_SYNC_ERROR');
    }
  })
);

/**
 * GET /api/ad-config/:id/sync/status
 * Get last sync status and stats
 */
router.get(
  '/:id/sync/status',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const status = await adConfigService.getSyncStatus(req.params.id);
    if (status === null) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    sendSuccess(res, status, 200, 'Sync status retrieved');
  })
);

module.exports = router;
