/**
 * Template Routes
 * 
 * Endpoints for managing deployment templates
 * Supports built-in and custom templates with versioning
 * 
 * Endpoints:
 *  - GET /api/templates - List all templates
 *  - GET /api/templates/:id - Get template details
 *  - POST /api/templates - Create custom template
 *  - PUT /api/templates/:id - Update template
 *  - DELETE /api/templates/:id - Delete template
 *  - POST /api/templates/:id/validate - Validate config against template
 *  - POST /api/templates/:id/deploy - Quick deploy from template
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { deploymentService } = require('../services');
const deploymentTemplateService = require('../services/deploymentTemplateService');
const { logger } = require('../services/logger');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// All template routes require authentication
router.use(authenticate);

/**
 * GET /api/templates
 * List all available templates
 * 
 * Query Parameters:
 * - cloudProvider: Filter by cloud provider
 * - category: Filter by category (basic|production|custom)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { cloudProvider, category } = req.query;

    try {
      const templates = deploymentTemplateService.getAllTemplates(cloudProvider);

      // Filter by category if specified
      let filtered = {
        builtin: templates.builtin,
        custom: templates.custom,
      };

      if (category) {
        filtered.builtin = filtered.builtin.filter(t => t.category === category);
        filtered.custom = filtered.custom.filter(t => t.category === category);
      }

      logger.info(`Templates listed`, {
        userId: req.user.id,
        cloudProvider,
        category,
        builtinCount: filtered.builtin.length,
        customCount: filtered.custom.length,
      });

      sendSuccess(res, {
        data: {
          builtin: filtered.builtin.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            cloudProvider: t.cloudProvider,
            category: t.category,
            version: t.version,
            parameterCount: t.parameters?.length || 0,
          })),
          custom: filtered.custom.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            cloudProvider: t.cloudProvider,
            category: t.category,
            version: t.version,
            parameterCount: t.parameters?.length || 0,
            createdAt: t.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Failed to list templates', error);
      sendError(res, 'Failed to list templates', 500, 'LIST_ERROR');
    }
  })
);

/**
 * GET /api/templates/:id
 * Get template details
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const template = deploymentTemplateService.getTemplate(id);

      if (!template) {
        return sendError(res, 'Template not found', 404, 'TEMPLATE_NOT_FOUND');
      }

      logger.info(`Template retrieved`, {
        userId: req.user.id,
        templateId: id,
        templateName: template.name,
      });

      sendSuccess(res, {
        data: {
          id: template.id,
          name: template.name,
          description: template.description,
          cloudProvider: template.cloudProvider,
          category: template.category,
          version: template.version,
          config: template.config,
          parameters: template.parameters,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve template', error);
      sendError(res, 'Failed to retrieve template', 500, 'RETRIEVE_ERROR');
    }
  })
);

/**
 * POST /api/templates
 * Create custom template
 * 
 * Body:
 * {
 *   name: string,
 *   description: string,
 *   cloudProvider: string,
 *   category?: string,
 *   config: object,
 *   parameters?: array,
 * }
 */
router.post(
  '/',
  authorize(['admin']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('cloudProvider').isIn(['aws', 'azure', 'gcp', 'digitalocean', 'linode']),
    body('config').isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    }

    try {
      const template = deploymentTemplateService.createTemplate(req.body, req.user.id);

      logger.info(`Custom template created`, {
        userId: req.user.id,
        templateId: template.id,
        templateName: template.name,
      });

      sendSuccess(
        res,
        {
          data: {
            id: template.id,
            name: template.name,
            cloudProvider: template.cloudProvider,
            version: template.version,
            createdAt: template.createdAt,
          },
        },
        201,
        'Template created successfully'
      );
    } catch (error) {
      logger.error('Failed to create template', error);
      sendError(res, error.message || 'Failed to create template', 400, 'CREATE_ERROR');
    }
  })
);

/**
 * PUT /api/templates/:id
 * Update template
 */
router.put(
  '/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const template = deploymentTemplateService.updateTemplate(id, req.body, req.user.id);

      logger.info(`Template updated`, {
        userId: req.user.id,
        templateId: id,
      });

      sendSuccess(res, {
        data: {
          id: template.id,
          name: template.name,
          version: template.version,
          updatedAt: template.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Failed to update template', error);
      sendError(
        res,
        error.message || 'Failed to update template',
        error.message.includes('not found') ? 404 : 400,
        'UPDATE_ERROR'
      );
    }
  })
);

/**
 * DELETE /api/templates/:id
 * Delete template
 */
router.delete(
  '/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      deploymentTemplateService.deleteTemplate(id, req.user.id);

      logger.info(`Template deleted`, {
        userId: req.user.id,
        templateId: id,
      });

      sendSuccess(res, {
        data: { id },
        message: 'Template deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete template', error);
      sendError(
        res,
        error.message || 'Failed to delete template',
        error.message.includes('not found') ? 404 : 400,
        'DELETE_ERROR'
      );
    }
  })
);

/**
 * POST /api/templates/:id/validate
 * Validate deployment configuration against template
 * 
 * Body:
 * {
 *   config: object (optional overrides to template config)
 * }
 */
router.post(
  '/:id/validate',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { config = {} } = req.body;

    try {
      const validation = deploymentTemplateService.validateDeploymentConfig(id, config);

      logger.info(`Template configuration validated`, {
        userId: req.user.id,
        templateId: id,
        valid: validation.valid,
      });

      sendSuccess(res, {
        data: {
          valid: validation.valid,
          errors: validation.errors,
          finalConfig: validation.finalConfig,
        },
      });
    } catch (error) {
      logger.error('Failed to validate template', error);
      sendError(
        res,
        error.message || 'Failed to validate template',
        error.message.includes('not found') ? 404 : 400,
        'VALIDATE_ERROR'
      );
    }
  })
);

/**
 * POST /api/templates/:id/deploy
 * Quick deploy from template
 * 
 * Body:
 * {
 *   credentialId: UUID,
 *   config?: object (optional overrides)
 * }
 */
router.post(
  '/:id/deploy',
  authorize(['admin', 'operator']),
  [
    body('credentialId').isUUID(),
    body('config').optional().isObject(),
  ],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { credentialId, config = {} } = req.body;

    try {
      const template = deploymentTemplateService.getTemplate(id);
      if (!template) {
        return sendError(res, 'Template not found', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Validate configuration
      const validation = deploymentTemplateService.validateDeploymentConfig(id, config);
      if (!validation.valid) {
        return sendError(
          res,
          `Configuration validation failed: ${validation.errors.join('; ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      // Create deployment from template
      const deployment = await deploymentService.createDeployment({
        credentialId,
        userId: req.user.id,
        clusterName: validation.finalConfig.clusterName,
        cloudProvider: template.cloudProvider,
        configuration: validation.finalConfig,
        templateId: id,
        templateVersion: template.version,
      });

      logger.info(`Deployment created from template`, {
        userId: req.user.id,
        templateId: id,
        deploymentId: deployment.id,
      });

      sendSuccess(
        res,
        {
          data: {
            deploymentId: deployment.id,
            clusterName: deployment.clusterName,
            cloudProvider: deployment.cloudProvider,
            status: deployment.status,
            createdAt: deployment.createdAt,
          },
        },
        201,
        'Deployment created from template'
      );
    } catch (error) {
      logger.error('Failed to deploy from template', error);
      sendError(
        res,
        error.message || 'Failed to deploy from template',
        400,
        'DEPLOY_ERROR'
      );
    }
  })
);

module.exports = router;
