/**
 * Logs Routes
 * 
 * Endpoints for querying, filtering, and exporting deployment logs
 * Integrates with LogService from Phase 5
 * 
 * Endpoints:
 *  - GET /api/logs/:deploymentId - Get logs for deployment
 *  - GET /api/logs/search - Search logs
 *  - POST /api/logs/:deploymentId/export - Export logs
 *  - DELETE /api/logs/:deploymentId - Delete logs
 */

const express = require('express');
const { Op } = require('sequelize');
const { Deployment, DeploymentLog } = require('../models');
const { logService, logger } = require('../services');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// All log routes require authentication
router.use(authenticate);

/**
 * GET /api/logs/:deploymentId
 * Get logs for specific deployment
 * 
 * Query Parameters:
 * - phase: Filter by deployment phase
 * - level: Filter by log level (info|warn|error|debug)
 * - limit: Results per page (default: 100, max: 1000)
 * - offset: Pagination offset (default: 0)
 */
router.get(
  '/:deploymentId',
  asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;
    const { phase, level, limit = 100, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 100, 1000);
    const offsetNum = parseInt(offset) || 0;

    try {
      // Verify deployment exists and belongs to user
      const deployment = await Deployment.findOne({
        where: {
          id: deploymentId,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      // Build filter
      const where = { deploymentId };
      if (phase) where.logType = phase;  // phase maps to logType column
      if (level) where.logLevel = level;  // level maps to logLevel column

      // Fetch logs with pagination
      const logs = await DeploymentLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset: offsetNum,
        raw: true,
      });

      logger.info(`Deployment logs retrieved`, {
        userId: req.user.id,
        deploymentId,
        logCount: logs.count,
      });

      sendSuccess(res, {
        data: {
          logs: logs.rows.map(log => ({
            id: log.id,
            timestamp: log.created_at,
            phase: log.log_type,        // logType from DB
            level: log.log_level,        // logLevel from DB
            message: log.message,
            details: log.data,           // data from DB
            source: log.source,
          })),
          pagination: {
            total: logs.count,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < logs.count,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve logs', error);
      sendError(res, 'Failed to retrieve logs', 500, 'LOG_RETRIEVAL_ERROR');
    }
  })
);

/**
 * GET /api/logs/search
 * Search logs across all deployments
 * 
 * Query Parameters:
 * - query: Search query string
 * - deploymentId: Filter by deployment (optional)
 * - phase: Filter by phase
 * - level: Filter by level
 * - startDate: Start date (ISO 8601)
 * - endDate: End date (ISO 8601)
 * - limit: Results per page (default: 50, max: 500)
 * - offset: Pagination offset (default: 0)
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const {
      query,
      deploymentId,
      phase,
      level,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    if (!query) {
      return sendError(res, 'Search query is required', 400, 'QUERY_REQUIRED');
    }

    const limitNum = Math.min(parseInt(limit) || 50, 500);
    const offsetNum = parseInt(offset) || 0;

    try {
      // Get all deployments for user
      const userDeployments = await Deployment.findAll({
        where: { userId: req.user.id },
        attributes: ['id'],
      });

      const deploymentIds = userDeployments.map(d => d.id);

      if (deploymentIds.length === 0) {
        return sendSuccess(res, {
          data: {
            results: [],
            pagination: { total: 0, limit: limitNum, offset: offsetNum, hasMore: false },
          },
        });
      }

      // Build where clause
      const where = {
        deploymentId: { [Op.in]: deploymentIds },
        [Op.or]: [
          { message: { [Op.like]: `%${query}%` } },
          { details: { [Op.like]: `%${query}%` } },
        ],
      };

      if (deploymentId) where.deploymentId = deploymentId;
      if (phase) where.phase = phase;
      if (level) where.level = level;

      if (startDate || endDate) {
        const dateWhere = {};
        if (startDate) dateWhere[Op.gte] = new Date(startDate);
        if (endDate) dateWhere[Op.lte] = new Date(endDate);
        where.createdAt = dateWhere;
      }

      // Search logs
      const results = await DeploymentLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset: offsetNum,
        raw: true,
      });

      logger.info(`Logs searched`, {
        userId: req.user.id,
        query,
        resultCount: results.count,
      });

      sendSuccess(res, {
        data: {
          results: results.rows.map(log => ({
            id: log.id,
            deploymentId: log.deploymentId,
            timestamp: log.createdAt,
            phase: log.phase,
            level: log.level,
            message: log.message,
            details: log.details,
          })),
          pagination: {
            total: results.count,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < results.count,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to search logs', error);
      sendError(res, 'Failed to search logs', 500, 'SEARCH_ERROR');
    }
  })
);

/**
 * GET /api/logs/export
 * Export logs for deployment
 * 
 * Query Parameters:
 * - deploymentId: Deployment ID (required)
 * - format: json|csv|txt (default: json)
 * - phase: Filter by phase
 * - level: Filter by level
 */
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { deploymentId, format = 'json', phase, level } = req.query;

    if (!deploymentId) {
      return sendError(res, 'deploymentId query parameter is required', 400, 'MISSING_DEPLOYMENT_ID');
    }

    if (!['json', 'csv', 'txt'].includes(format)) {
      return sendError(res, 'Invalid format. Use json, csv, or txt', 400, 'INVALID_FORMAT');
    }

    try {
      // Verify deployment exists and belongs to user
      const deployment = await Deployment.findOne({
        where: {
          id: deploymentId,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      // Fetch all logs for deployment
      const where = { deploymentId };
      if (phase) where.phase = phase;
      if (level) where.level = level;

      const logs = await DeploymentLog.findAll({
        where,
        order: [['createdAt', 'ASC']],
        raw: true,
      });

      const filename = `deployment-${deploymentId}-logs-${new Date().toISOString().split('T')[0]}`;

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.send(
          JSON.stringify(
            {
              deploymentId,
              clusterName: deployment.clusterName,
              cloudProvider: deployment.cloudProvider,
              exportedAt: new Date().toISOString(),
              logs: logs.map(log => ({
                timestamp: log.createdAt,
                phase: log.phase,
                level: log.level,
                message: log.message,
                details: log.details,
              })),
            },
            null,
            2
          )
        );
      } else if (format === 'csv') {
        const headers = 'Timestamp,Phase,Level,Message,Details';
        const rows = logs.map(log =>
          [
            log.createdAt,
            log.phase,
            log.level,
            `"${(log.message || '').replace(/"/g, '""')}"`,
            `"${(log.details || '').replace(/"/g, '""')}"`,
          ].join(',')
        );

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send([headers, ...rows].join('\n'));
      } else if (format === 'txt') {
        const content = logs
          .map(
            log =>
              `[${log.createdAt}] [${log.level.toUpperCase()}] [${log.phase}] ${log.message}\n${
                log.details ? '  Details: ' + log.details : ''
              }`
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
        res.send(content);
      }

      logger.info(`Logs exported`, {
        userId: req.user.id,
        deploymentId,
        format,
        logCount: logs.length,
      });
    } catch (error) {
      logger.error('Failed to export logs', error);
      sendError(res, 'Failed to export logs', 500, 'EXPORT_ERROR');
    }
  })
);

/**
 * DELETE /api/logs/:deploymentId
 * Delete logs for deployment (requires admin role)
 */
router.delete(
  '/:deploymentId',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;

    try {
      // Verify deployment exists and belongs to user
      const deployment = await Deployment.findOne({
        where: {
          id: deploymentId,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404, 'DEPLOYMENT_NOT_FOUND');
      }

      // Delete logs
      const deletedCount = await DeploymentLog.destroy({
        where: { deploymentId },
      });

      logger.warn(`Logs deleted`, {
        userId: req.user.id,
        deploymentId,
        logCount: deletedCount,
      });

      sendSuccess(res, {
        data: { deletedCount },
        message: `${deletedCount} log entries deleted`,
      });
    } catch (error) {
      logger.error('Failed to delete logs', error);
      sendError(res, 'Failed to delete logs', 500, 'DELETE_ERROR');
    }
  })
);

module.exports = router;
