const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const infrastructureDiscovery = require('../services/infrastructureDiscovery');
const { logger } = require('../services');

const router = express.Router();

// All infrastructure routes require authentication
router.use(authenticate);

/**
 * GET /api/infrastructure/discover/:credentialId
 * Discover all infrastructure for a specific credential
 */
router.get(
  '/discover/:credentialId',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const { credentialId } = req.params;
      
      logger.info('[Infrastructure] Discovering infrastructure', { credentialId, userId: req.user.id });
      
      const discovered = await infrastructureDiscovery.discoverAll(credentialId, req.user.id);
      
      sendSuccess(res, discovered, 200, 'Infrastructure discovered successfully');
    } catch (error) {
      logger.error('[Infrastructure] Discovery failed', { error: error.message });
      sendError(res, error.message, 500, 'DISCOVERY_ERROR');
    }
  })
);

/**
 * GET /api/infrastructure/databases
 * Get all available databases across all credentials and deployments
 */
router.get(
  '/databases',
  authorize(['admin', 'operator', 'viewer']),
  asyncHandler(async (req, res) => {
    try {
      logger.info('[Infrastructure] Fetching all available databases', { userId: req.user.id });
      
      const databases = await infrastructureDiscovery.getAllAvailableDatabases(req.user.id);
      
      sendSuccess(res, { databases, total: databases.length }, 200, 'Databases retrieved successfully');
    } catch (error) {
      logger.error('[Infrastructure] Failed to get databases', { error: error.message });
      sendError(res, error.message, 500, 'DATABASE_DISCOVERY_ERROR');
    }
  })
);

/**
 * GET /api/infrastructure/databases/:credentialId
 * Get databases for a specific credential (cloud discovery only)
 */
router.get(
  '/databases/:credentialId',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const { credentialId } = req.params;
      
      logger.info('[Infrastructure] Discovering databases for credential', { credentialId, userId: req.user.id });
      
      const discovered = await infrastructureDiscovery.discoverAll(credentialId, req.user.id);
      
      sendSuccess(res, { 
        databases: discovered.rdsInstances,
        total: discovered.rdsInstances.length,
        region: discovered.region,
        cloudProvider: discovered.cloudProvider,
      }, 200, 'Databases discovered successfully');
    } catch (error) {
      logger.error('[Infrastructure] Database discovery failed', { error: error.message });
      sendError(res, error.message, 500, 'DATABASE_DISCOVERY_ERROR');
    }
  })
);

/**
 * GET /api/infrastructure/container-registries/:credentialId
 * Get container registries (ECR/ACR/GCR) for a specific credential
 */
router.get(
  '/container-registries/:credentialId',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    try {
      const { credentialId } = req.params;
      
      logger.info('[Infrastructure] Discovering container registries for credential', { credentialId, userId: req.user.id });
      
      const discovered = await infrastructureDiscovery.discoverAll(credentialId, req.user.id);
      
      sendSuccess(res, { 
        registries: discovered.ecrRepositories || [],
        total: discovered.ecrRepositories?.length || 0,
        region: discovered.region,
        cloudProvider: discovered.cloudProvider,
      }, 200, 'Container registries discovered successfully');
    } catch (error) {
      logger.error('[Infrastructure] Container registry discovery failed', { error: error.message });
      sendError(res, error.message, 500, 'REGISTRY_DISCOVERY_ERROR');
    }
  })
);

/**
 * POST /api/infrastructure/databases/:credentialId/query
 * Execute a query against a cloud-discovered database
 * DEPRECATED: Use /api/database-credentials/:id/query instead
 */
router.post(
  '/databases/:credentialId/query',
  authorize(['admin', 'operator']),
  asyncHandler(async (req, res) => {
    // Redirect to the new database credentials API
    sendError(
      res, 
      'This endpoint is deprecated. To query databases, first create database credentials at POST /api/database-credentials, ' +
      'then use POST /api/database-credentials/:id/query to execute queries. ' +
      'Database credentials store encrypted username/password for authentication.',
      410, // HTTP 410 Gone
      'DEPRECATED'
    );
  })
);

module.exports = router;
