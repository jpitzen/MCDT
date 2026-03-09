/**
 * AD Role Mapping Routes
 *
 * Nested under /api/ad-config/:configId/role-mappings
 * All endpoints require authenticate + authorize(['admin']) — applied by parent router.
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { AdRoleMapping, AdConfiguration } = require('../models');
const adConfigService = require('../services/adConfigService');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { logger } = require('../services');

const router = express.Router({ mergeParams: true });

/**
 * GET /api/ad-config/:configId/role-mappings
 * List all role mappings for a configuration
 */
router.get(
  '/',
  [param('configId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid config ID', 400, 'VALIDATION_ERROR', errors.array());
    }

    // Verify config exists
    const configResult = await adConfigService.getConfig(req.params.configId);
    if (!configResult) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    const mappings = await AdRoleMapping.findAll({
      where: { adConfigId: req.params.configId },
      order: [['priority', 'DESC']],
    });

    sendSuccess(res, { mappings }, 200, 'Role mappings retrieved');
  })
);

/**
 * POST /api/ad-config/:configId/role-mappings
 * Create a new group→role mapping
 */
router.post(
  '/',
  [
    param('configId').isUUID(),
    body('adGroupDn').trim().isLength({ min: 1 }).contains('=').withMessage('AD group DN is required'),
    body('adGroupName').trim().isLength({ min: 1, max: 200 }).withMessage('AD group name is required'),
    body('mappedRole')
      .isIn(['admin', 'approver', 'operator', 'viewer'])
      .withMessage('Mapped role must be admin, approver, operator, or viewer'),
    body('priority')
      .optional()
      .isInt({ min: 0, max: 1000 })
      .withMessage('Priority must be 0–1000'),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    // Verify config exists
    const configResult = await adConfigService.getConfig(req.params.configId);
    if (!configResult) {
      return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
    }

    try {
      const mapping = await AdRoleMapping.create({
        adConfigId: req.params.configId,
        adGroupDn: req.body.adGroupDn,
        adGroupName: req.body.adGroupName,
        mappedRole: req.body.mappedRole,
        priority: req.body.priority || 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      });

      await adConfigService.audit(
        'ad_role_mapping.create', req.user.id, mapping.id, req.body.adGroupName,
        { groupDn: req.body.adGroupDn, mappedRole: req.body.mappedRole, priority: mapping.priority },
        'success', req
      );

      sendSuccess(res, { mapping }, 201, 'Role mapping created');
    } catch (error) {
      logger.error('Failed to create role mapping', error);
      sendError(res, 'Failed to create role mapping', 500, 'ROLE_MAPPING_CREATE_ERROR');
    }
  })
);

/**
 * PUT /api/ad-config/:configId/role-mappings/:id
 * Update a role mapping
 */
router.put(
  '/:id',
  [
    param('configId').isUUID(),
    param('id').isUUID(),
    body('adGroupDn').optional().trim().isLength({ min: 1 }).contains('='),
    body('adGroupName').optional().trim().isLength({ min: 1, max: 200 }),
    body('mappedRole')
      .optional()
      .isIn(['admin', 'approver', 'operator', 'viewer']),
    body('priority').optional().isInt({ min: 0, max: 1000 }),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const mapping = await AdRoleMapping.findOne({
      where: { id: req.params.id, adConfigId: req.params.configId },
    });
    if (!mapping) {
      return sendError(res, 'Role mapping not found', 404, 'ROLE_MAPPING_NOT_FOUND');
    }

    try {
      const allowedFields = ['adGroupDn', 'adGroupName', 'mappedRole', 'priority', 'isActive'];
      const changes = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          changes[key] = req.body[key];
          mapping[key] = req.body[key];
        }
      }

      await mapping.save();

      await adConfigService.audit(
        'ad_role_mapping.update', req.user.id, mapping.id, mapping.adGroupName,
        changes, 'success', req
      );

      sendSuccess(res, { mapping }, 200, 'Role mapping updated');
    } catch (error) {
      logger.error('Failed to update role mapping', error);
      sendError(res, 'Failed to update role mapping', 500, 'ROLE_MAPPING_UPDATE_ERROR');
    }
  })
);

/**
 * DELETE /api/ad-config/:configId/role-mappings/:id
 * Delete a role mapping
 */
router.delete(
  '/:id',
  [
    param('configId').isUUID(),
    param('id').isUUID(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const mapping = await AdRoleMapping.findOne({
      where: { id: req.params.id, adConfigId: req.params.configId },
    });
    if (!mapping) {
      return sendError(res, 'Role mapping not found', 404, 'ROLE_MAPPING_NOT_FOUND');
    }

    const name = mapping.adGroupName;
    await mapping.destroy();

    await adConfigService.audit(
      'ad_role_mapping.delete', req.user.id, req.params.id, name,
      {}, 'success', req
    );

    sendSuccess(res, { deleted: { id: req.params.id, groupName: name } }, 200, 'Role mapping deleted');
  })
);

/**
 * POST /api/ad-config/:configId/role-mappings/test
 * Test role resolution for a given username
 */
router.post(
  '/test',
  [
    param('configId').isUUID(),
    body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const result = await adConfigService.testRoleResolution(
        req.params.configId, req.body.username
      );
      if (result === null) {
        return sendError(res, 'AD configuration not found', 404, 'AD_CONFIG_NOT_FOUND');
      }

      sendSuccess(res, result, 200, 'Role resolution test completed');
    } catch (error) {
      logger.error('Role resolution test error', error);
      sendError(res, 'Role resolution test failed', 500, 'ROLE_RESOLUTION_TEST_ERROR');
    }
  })
);

module.exports = router;
