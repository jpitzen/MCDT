/**
 * Alerts Routes
 * 
 * Comprehensive endpoints for alert management, configuration, and history
 * Integrates with AlertService and SecureAlertService from Phase 5
 * 
 * Endpoints:
 *  - POST /api/alerts/channels - Create alert channel
 *  - GET /api/alerts/channels - List channels
 *  - PUT /api/alerts/channels/:id - Update channel
 *  - DELETE /api/alerts/channels/:id - Delete channel
 *  - POST /api/alerts/channels/:id/test - Test channel
 *  - POST /api/alerts/rules - Create alert rule
 *  - GET /api/alerts/rules - List rules
 *  - PUT /api/alerts/rules/:id - Update rule
 *  - DELETE /api/alerts/rules/:id - Delete rule
 *  - GET /api/alerts/history - Alert history
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AlertChannelConfig, AuditLog } = require('../models');
const { alertService, secureAlertService, logger } = require('../services');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// All alert routes require authentication
router.use(authenticate);

/**
 * POST /api/alerts/channels
 * Create new alert notification channel
 * 
 * Body:
 * {
 *   name: string,
 *   channelType: 'email' | 'slack' | 'webhook',
 *   description?: string,
 *   enabled?: boolean,
 *   // Email-specific:
 *   smtpHost?: string,
 *   smtpPort?: number,
 *   smtpUser?: string,
 *   smtpPassword?: string,
 *   smtpSecure?: boolean,
 *   emailFrom?: string,
 *   emailRecipients?: string[],
 *   // Slack-specific:
 *   slackWebhookUrl?: string,
 *   slackChannel?: string,
 *   // Webhook-specific:
 *   webhookUrl?: string,
 *   webhookMethod?: 'POST' | 'PUT',
 *   webhookAuthType?: 'none' | 'bearer' | 'api-key' | 'basic',
 *   webhookAuth?: string,
 * }
 */
router.post(
  '/channels',
  authorize(['admin', 'operator']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('channelType').isIn(['email', 'slack', 'webhook']),
    body('description').optional().isString(),
    body('enabled').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { name, channelType, ...channelData } = req.body;

    try {
      // Validate channel-specific fields
      if (channelType === 'email') {
        if (!channelData.smtpHost || !channelData.smtpUser || !channelData.smtpPassword) {
          return sendError(
            res,
            'Email channel requires smtpHost, smtpUser, and smtpPassword',
            400,
            'INVALID_EMAIL_CONFIG'
          );
        }
      } else if (channelType === 'slack') {
        if (!channelData.slackWebhookUrl) {
          return sendError(
            res,
            'Slack channel requires slackWebhookUrl',
            400,
            'INVALID_SLACK_CONFIG'
          );
        }
      } else if (channelType === 'webhook') {
        if (!channelData.webhookUrl) {
          return sendError(
            res,
            'Webhook channel requires webhookUrl',
            400,
            'INVALID_WEBHOOK_CONFIG'
          );
        }
      }

      // Create channel with encrypted credentials
      const channel = await AlertChannelConfig.createSecure(
        req.user,
        {
          name,
          channelType,
          enabled: channelData.enabled !== false,
          description: channelData.description || '',
          ...channelData,
        },
        secureAlertService
      );

      logger.info(`Alert channel created`, {
        userId: req.user.id,
        channelId: channel.id,
        channelType,
        channelName: name,
      });

      sendSuccess(
        res,
        {
          data: {
            id: channel.id,
            name: channel.name,
            channelType: channel.channelType,
            enabled: channel.enabled,
            createdAt: channel.createdAt,
          },
        },
        201,
        'Alert channel created successfully'
      );
    } catch (error) {
      logger.error('Failed to create alert channel', error);
      sendError(res, 'Failed to create alert channel', 500, 'CHANNEL_CREATE_ERROR');
    }
  })
);

/**
 * GET /api/alerts/channels/:id
 * Get single alert channel by ID
 */
router.get(
  '/channels/:id',
  asyncHandler(async (req, res) => {
    try {
      const channel = await AlertChannelConfig.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
        include: [{
          model: require('../models').User,
          attributes: ['id', 'email', 'firstName', 'lastName'],
        }],
      });

      if (!channel) {
        return sendError(res, 'Alert channel not found', 404, 'CHANNEL_NOT_FOUND');
      }

      logger.info(`Alert channel retrieved`, {
        userId: req.user.id,
        channelId: channel.id,
      });

      sendSuccess(res, {
        data: {
          id: channel.id,
          name: channel.name,
          channelType: channel.channelType,
          description: channel.description,
          enabled: channel.enabled,
          createdAt: channel.createdAt,
          updatedAt: channel.updatedAt,
          user: channel.User,
        },
      });
    } catch (error) {
      logger.error('Failed to get alert channel', error);
      sendError(res, 'Failed to get alert channel', 500, 'CHANNEL_GET_ERROR');
    }
  })
);

/**
 * GET /api/alerts/channels
 * List all alert channels for user
 * 
 * Query Parameters:
 * - channelType: Filter by type (email|slack|webhook)
 * - enabled: Filter by enabled status (true|false)
 */
router.get(
  '/channels',
  asyncHandler(async (req, res) => {
    const { channelType, enabled } = req.query;

    try {
      const where = { userId: req.user.id };
      if (channelType) where.channelType = channelType;
      if (enabled !== undefined) where.enabled = enabled === 'true';

      const channels = await AlertChannelConfig.findAll({
        where,
        attributes: {
          exclude: [
            'encryptedSmtpPassword',
            'smtpPasswordIv',
            'smtpPasswordAuthTag',
            'encryptedSlackWebhookUrl',
            'slackWebhookIv',
            'slackWebhookAuthTag',
            'encryptedWebhookUrl',
            'webhookUrlIv',
            'webhookUrlAuthTag',
            'encryptedWebhookAuth',
            'webhookAuthIv',
            'webhookAuthAuthTag',
          ],
        },
        order: [['createdAt', 'DESC']],
      });

      logger.info(`Alert channels listed`, {
        userId: req.user.id,
        channelCount: channels.length,
      });

      sendSuccess(res, {
        data: {
          channels: channels.map(c => ({
            id: c.id,
            name: c.name,
            channelType: c.channelType,
            description: c.description,
            enabled: c.enabled,
            lastTestedAt: c.lastTestedAt,
            lastTestResult: c.lastTestResult,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Failed to list alert channels', error);
      sendError(res, 'Failed to list channels', 500, 'CHANNEL_LIST_ERROR');
    }
  })
);

/**
 * PUT /api/alerts/channels/:id
 * Update alert channel
 */
router.put(
  '/channels/:id',
  authorize(['admin', 'operator']),
  [body('enabled').optional().isBoolean()],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { enabled, description, ...updatedConfig } = req.body;

    try {
      const channel = await AlertChannelConfig.findOne({
        where: { id, userId: req.user.id },
      });

      if (!channel) {
        return sendError(res, 'Alert channel not found', 404, 'CHANNEL_NOT_FOUND');
      }

      // Update basic fields
      if (enabled !== undefined) channel.enabled = enabled;
      if (description !== undefined) channel.description = description;

      // Re-encrypt sensitive fields if provided
      if (updatedConfig.smtpPassword && channel.channelType === 'email') {
        const encrypted = secureAlertService.encryptSmtpCredentials({
          password: updatedConfig.smtpPassword,
        });
        channel.encryptedSmtpPassword = encrypted.encryptedData;
        channel.smtpPasswordIv = encrypted.iv;
        channel.smtpPasswordAuthTag = encrypted.authTag;
      }

      await channel.save();

      logger.info(`Alert channel updated`, {
        userId: req.user.id,
        channelId: id,
      });

      sendSuccess(res, {
        data: {
          id: channel.id,
          name: channel.name,
          enabled: channel.enabled,
          updatedAt: channel.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Failed to update alert channel', error);
      sendError(res, 'Failed to update channel', 500, 'CHANNEL_UPDATE_ERROR');
    }
  })
);

/**
 * DELETE /api/alerts/channels/:id
 * Delete alert channel
 */
router.delete(
  '/channels/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const channel = await AlertChannelConfig.findOne({
        where: { id, userId: req.user.id },
      });

      if (!channel) {
        return sendError(res, 'Alert channel not found', 404, 'CHANNEL_NOT_FOUND');
      }

      await channel.destroy();

      logger.info(`Alert channel deleted`, {
        userId: req.user.id,
        channelId: id,
        channelName: channel.name,
      });

      sendSuccess(res, {
        data: { id },
        message: 'Alert channel deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete alert channel', error);
      sendError(res, 'Failed to delete channel', 500, 'CHANNEL_DELETE_ERROR');
    }
  })
);

/**
 * POST /api/alerts/channels/:id/test
 * Test alert channel configuration
 */
router.post(
  '/channels/:id/test',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const channel = await AlertChannelConfig.findByIdSecure(id, secureAlertService);

      if (!channel) {
        return sendError(res, 'Alert channel not found', 404, 'CHANNEL_NOT_FOUND');
      }

      if (channel.userId !== req.user.id) {
        return sendError(res, 'Unauthorized', 403, 'UNAUTHORIZED');
      }

      // Test the channel
      const result = await secureAlertService.testChannel(channel);

      // Update test result in database
      const channelRecord = await AlertChannelConfig.findByPk(id);
      channelRecord.lastTestedAt = new Date();
      channelRecord.lastTestResult = result.success ? 'success' : 'failed';
      await channelRecord.save();

      logger.info(`Alert channel tested`, {
        userId: req.user.id,
        channelId: id,
        result: result.success ? 'success' : 'failed',
      });

      sendSuccess(res, {
        data: {
          success: result.success,
          message: result.message,
          testTime: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to test alert channel', error);
      sendError(res, 'Failed to test channel', 500, 'CHANNEL_TEST_ERROR');
    }
  })
);

/**
 * POST /api/alerts/rules
 * Create new alert rule
 * 
 * Body:
 * {
 *   name: string,
 *   description: string,
 *   enabled: boolean,
 *   channelIds: UUID[],
 *   condition: {
 *     field: string,
 *     operator: '=' | '!=' | '>' | '<' | 'contains',
 *     value: any,
 *   },
 *   severity: 'low' | 'medium' | 'high' | 'critical',
 * }
 */
router.post(
  '/rules',
  authorize(['admin', 'operator']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString(),
    body('enabled').optional().isBoolean(),
    body('channelIds').isArray(),
    body('condition').isObject(),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    const rule = req.body;

    try {
      // Verify channels belong to user
      const channelCount = await AlertChannelConfig.count({
        where: {
          id: { [Op.in]: rule.channelIds },
          userId: req.user.id,
        },
      });

      if (channelCount !== rule.channelIds.length) {
        return sendError(
          res,
          'One or more channels not found or not accessible',
          400,
          'INVALID_CHANNELS'
        );
      }

      // Create rule
      const createdRule = await alertService.registerAlertRule({
        ...rule,
        userId: req.user.id,
      });

      logger.info(`Alert rule created`, {
        userId: req.user.id,
        ruleId: createdRule.id,
        ruleName: rule.name,
      });

      sendSuccess(
        res,
        {
          data: createdRule,
        },
        201,
        'Alert rule created successfully'
      );
    } catch (error) {
      logger.error('Failed to create alert rule', error);
      sendError(res, 'Failed to create rule', 500, 'RULE_CREATE_ERROR');
    }
  })
);

/**
 * GET /api/alerts/rules
 * List all alert rules for user
 */
router.get(
  '/rules',
  asyncHandler(async (req, res) => {
    try {
      const rules = await alertService.getAlertRules(req.user.id);

      logger.info(`Alert rules listed`, {
        userId: req.user.id,
        ruleCount: rules.length,
      });

      sendSuccess(res, {
        data: { rules },
      });
    } catch (error) {
      logger.error('Failed to list alert rules', error);
      sendError(res, 'Failed to list rules', 500, 'RULE_LIST_ERROR');
    }
  })
);

/**
 * PUT /api/alerts/rules/:id
 * Update alert rule
 */
router.put(
  '/rules/:id',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const updatedRule = await alertService.updateAlertRule(id, req.body, req.user.id);

      if (!updatedRule) {
        return sendError(res, 'Alert rule not found', 404, 'RULE_NOT_FOUND');
      }

      logger.info(`Alert rule updated`, {
        userId: req.user.id,
        ruleId: id,
      });

      sendSuccess(res, {
        data: updatedRule,
      });
    } catch (error) {
      logger.error('Failed to update alert rule', error);
      sendError(res, 'Failed to update rule', 500, 'RULE_UPDATE_ERROR');
    }
  })
);

/**
 * DELETE /api/alerts/rules/:id
 * Delete alert rule
 */
router.delete(
  '/rules/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const deleted = await alertService.deleteAlertRule(id, req.user.id);

      if (!deleted) {
        return sendError(res, 'Alert rule not found', 404, 'RULE_NOT_FOUND');
      }

      logger.info(`Alert rule deleted`, {
        userId: req.user.id,
        ruleId: id,
      });

      sendSuccess(res, {
        data: { id },
        message: 'Alert rule deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete alert rule', error);
      sendError(res, 'Failed to delete rule', 500, 'RULE_DELETE_ERROR');
    }
  })
);

/**
 * GET /api/alerts/history
 * Get alert trigger history
 * 
 * Query Parameters:
 * - days: Number of days (default: 7)
 * - severity: Filter by severity
 * - status: Filter by status (sent|failed|pending)
 * - limit: Results per page (default: 50, max: 500)
 * - offset: Pagination offset (default: 0)
 */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const {
      days = 7,
      severity,
      status,
      limit = 50,
      offset = 0,
    } = req.query;
    const daysNum = Math.min(parseInt(days) || 7, 90);
    const limitNum = Math.min(parseInt(limit) || 50, 500);
    const offsetNum = parseInt(offset) || 0;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const where = {
        userId: req.user.id,
        createdAt: { [Op.gte]: startDate },
        action: { [Op.like]: '%alert%' },
      };

      if (severity) where.metadata = { [Op.like]: `%"severity":"${severity}"%` };
      if (status) where.metadata = { [Op.like]: `%"status":"${status}"%` };

      const alerts = await AuditLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset: offsetNum,
      });

      logger.info(`Alert history retrieved`, {
        userId: req.user.id,
        days: daysNum,
        alertCount: alerts.count,
      });

      sendSuccess(res, {
        data: {
          alerts: alerts.rows.map(a => ({
            id: a.id,
            timestamp: a.createdAt,
            action: a.action,
            status: a.metadata?.status || 'sent',
            severity: a.metadata?.severity,
            details: a.details,
          })),
          pagination: {
            total: alerts.count,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < alerts.count,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve alert history', error);
      sendError(res, 'Failed to retrieve alert history', 500, 'HISTORY_ERROR');
    }
  })
);

module.exports = router;
