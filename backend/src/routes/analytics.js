/**
 * Analytics Routes
 * 
 * Provides comprehensive endpoints for deployment metrics, trends, and analytics
 * Integrates with MetricsCollector and LogService from Phase 5
 * 
 * Endpoints:
 *  - GET /api/analytics/metrics - Aggregate metrics across all deployments
 *  - GET /api/analytics/trends - Historical trend analysis
 *  - GET /api/analytics/performance - Performance metrics by cloud provider
 *  - GET /api/analytics/cost - Cost analysis and breakdown
 *  - GET /api/analytics/export - Export analytics data
 *  - GET /api/analytics/predictions - Predictive analytics
 */

const express = require('express');
const { Op } = require('sequelize');
const { Deployment, DeploymentLog } = require('../models');
const { metricsCollector, logService, logger } = require('../services');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * GET /api/analytics/metrics
 * Get aggregate metrics across all user deployments
 * 
 * Query Parameters:
 * - days: Number of days to include (default: 30)
 * - cloudProvider: Filter by cloud provider (aws, azure, gcp, digitalocean, linode)
 * - status: Filter by deployment status (completed, failed, in-progress)
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const { days = 30, cloudProvider, status } = req.query;
    const daysNum = Math.min(parseInt(days) || 30, 365); // Max 365 days

    try {
      // Build filter query
      const where = { userId: req.user.id };
      if (cloudProvider) where.cloudProvider = cloudProvider;
      if (status) where.status = status;

      // Fetch deployments within date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const deployments = await Deployment.findAll({
        where: {
          ...where,
          createdAt: { [Op.gte]: startDate },
        },
      });

      if (!deployments || deployments.length === 0) {
        return sendSuccess(res, {
          data: {
            totalDeployments: 0,
            successCount: 0,
            failureCount: 0,
            averageDuration: 0,
            averageCost: 0,
            successRate: 0,
            cloudProviderBreakdown: {},
            statusBreakdown: {},
          },
        });
      }

      // Calculate metrics
      const metrics = metricsCollector.calculateAggregateMetrics(deployments);

      logger.info(`Analytics metrics retrieved`, {
        userId: req.user.id,
        days: daysNum,
        deploymentCount: deployments.length,
      });

      sendSuccess(res, {
        data: {
          timeRange: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days: daysNum,
          },
          ...metrics,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve analytics metrics', error);
      sendError(res, 'Failed to retrieve metrics', 500, 'METRICS_ERROR');
    }
  })
);

/**
 * GET /api/analytics/trends
 * Get historical trend data for line charts
 * 
 * Query Parameters:
 * - days: Number of days (default: 30)
 * - metric: success|duration|cost (default: success)
 * - interval: daily|weekly|monthly (default: daily)
 */
router.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const { days = 30, metric = 'success', interval = 'daily' } = req.query;
    const daysNum = Math.min(parseInt(days) || 30, 365);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const deployments = await Deployment.findAll({
        where: {
          userId: req.user.id,
          createdAt: { [Op.gte]: startDate },
        },
        order: [['createdAt', 'ASC']],
      });

      // Calculate trends based on interval
      const trends = metricsCollector.calculateTrends(
        deployments,
        metric,
        interval,
        daysNum
      );

      logger.info(`Trends retrieved`, {
        userId: req.user.id,
        metric,
        interval,
        dataPoints: trends.length,
      });

      sendSuccess(res, {
        data: {
          metric,
          interval,
          timeRange: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days: daysNum,
          },
          trends,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve trends', error);
      sendError(res, 'Failed to retrieve trends', 500, 'TRENDS_ERROR');
    }
  })
);

/**
 * GET /api/analytics/performance
 * Performance metrics by cloud provider
 * 
 * Query Parameters:
 * - days: Number of days (default: 30)
 */
router.get(
  '/performance',
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = Math.min(parseInt(days) || 30, 365);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const deployments = await Deployment.findAll({
        where: {
          userId: req.user.id,
          createdAt: { [Op.gte]: startDate },
        },
      });

      // Group by cloud provider
      const performanceByProvider = {};
      const providers = ['aws', 'azure', 'gcp', 'digitalocean', 'linode'];

      for (const provider of providers) {
        const providerDeployments = deployments.filter(
          d => d.cloudProvider === provider
        );
        if (providerDeployments.length > 0) {
          performanceByProvider[provider] = metricsCollector.calculateAggregateMetrics(
            providerDeployments
          );
        }
      }

      logger.info(`Performance metrics retrieved`, {
        userId: req.user.id,
        providers: Object.keys(performanceByProvider),
      });

      sendSuccess(res, {
        data: {
          timeRange: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days: daysNum,
          },
          performanceByProvider,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve performance metrics', error);
      sendError(res, 'Failed to retrieve performance metrics', 500, 'PERFORMANCE_ERROR');
    }
  })
);

/**
 * GET /api/analytics/cost
 * Cost analysis and breakdown
 * 
 * Query Parameters:
 * - days: Number of days (default: 30)
 * - breakdown: provider|phase|cluster (default: provider)
 */
router.get(
  '/cost',
  asyncHandler(async (req, res) => {
    const { days = 30, breakdown = 'provider' } = req.query;
    const daysNum = Math.min(parseInt(days) || 30, 365);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const deployments = await Deployment.findAll({
        where: {
          userId: req.user.id,
          createdAt: { [Op.gte]: startDate },
        },
      });

      // Calculate cost breakdown
      let costData = {};
      const totalCost = deployments.reduce((sum, d) => {
        const cost = d.metricsData?.estimatedCost || 0;
        return sum + cost;
      }, 0);

      if (breakdown === 'provider') {
        const providers = {};
        deployments.forEach(d => {
          if (!providers[d.cloudProvider]) {
            providers[d.cloudProvider] = { deployments: 0, cost: 0 };
          }
          providers[d.cloudProvider].deployments += 1;
          providers[d.cloudProvider].cost += d.metricsData?.estimatedCost || 0;
        });
        costData = providers;
      } else if (breakdown === 'phase') {
        const phases = {};
        deployments.forEach(d => {
          if (d.metricsData?.phaseMetrics) {
            Object.entries(d.metricsData.phaseMetrics).forEach(([phase, metrics]) => {
              if (!phases[phase]) phases[phase] = 0;
              phases[phase] += metrics.estimatedCost || 0;
            });
          }
        });
        costData = phases;
      } else if (breakdown === 'cluster') {
        const clusters = {};
        deployments.forEach(d => {
          if (!clusters[d.clusterName]) {
            clusters[d.clusterName] = { deployments: 0, cost: 0, provider: d.cloudProvider };
          }
          clusters[d.clusterName].deployments += 1;
          clusters[d.clusterName].cost += d.metricsData?.estimatedCost || 0;
        });
        costData = clusters;
      }

      logger.info(`Cost analysis retrieved`, {
        userId: req.user.id,
        breakdown,
        totalCost,
      });

      sendSuccess(res, {
        data: {
          timeRange: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days: daysNum,
          },
          breakdown,
          totalCost,
          costData,
          averageCostPerDeployment: deployments.length > 0 ? totalCost / deployments.length : 0,
        },
      });
    } catch (error) {
      logger.error('Failed to calculate cost analysis', error);
      sendError(res, 'Failed to calculate cost', 500, 'COST_ANALYSIS_ERROR');
    }
  })
);

/**
 * GET /api/analytics/export
 * Export analytics data in CSV or JSON format
 * 
 * Query Parameters:
 * - format: json|csv (default: json)
 * - days: Number of days (default: 30)
 */
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { format = 'json', days = 30 } = req.query;
    const daysNum = Math.min(parseInt(days) || 30, 365);

    try {
      if (!['json', 'csv'].includes(format)) {
        return sendError(res, 'Invalid format. Use json or csv', 400, 'INVALID_FORMAT');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const deployments = await Deployment.findAll({
        where: {
          userId: req.user.id,
          createdAt: { [Op.gte]: startDate },
        },
        include: ['logs'],
      });

      const exportData = deployments.map(d => ({
        id: d.id,
        clusterName: d.clusterName,
        cloudProvider: d.cloudProvider,
        status: d.status,
        progress: d.progress,
        duration: d.metricsData?.totalDuration || 0,
        cost: d.metricsData?.estimatedCost || 0,
        successRate: d.metricsData?.successRate || 0,
        createdAt: d.createdAt,
        completedAt: d.completedAt,
      }));

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.json"`
        );
        res.send(JSON.stringify(exportData, null, 2));
      } else {
        // CSV format
        const headers = Object.keys(exportData[0] || {});
        const csvContent = [
          headers.join(','),
          ...exportData.map(row =>
            headers.map(h => JSON.stringify(row[h] || '')).join(',')
          ),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.csv"`
        );
        res.send(csvContent);
      }

      logger.info(`Analytics data exported`, {
        userId: req.user.id,
        format,
        recordCount: exportData.length,
      });
    } catch (error) {
      logger.error('Failed to export analytics', error);
      sendError(res, 'Failed to export data', 500, 'EXPORT_ERROR');
    }
  })
);

/**
 * GET /api/analytics/predictions
 * Predictive analytics based on historical data
 * 
 * Query Parameters:
 * - days: Historical days to use (default: 30)
 * - prediction: duration|success|cost (default: duration)
 */
router.get(
  '/predictions',
  asyncHandler(async (req, res) => {
    const { days = 30, prediction = 'duration' } = req.query;
    const daysNum = Math.min(parseInt(days) || 30, 365);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const deployments = await Deployment.findAll({
        where: {
          userId: req.user.id,
          status: 'completed',
          createdAt: { [Op.gte]: startDate },
        },
      });

      if (deployments.length < 3) {
        return sendSuccess(res, {
          data: {
            prediction,
            status: 'insufficient_data',
            message: 'At least 3 completed deployments required for predictions',
            recommendedHistoricalDays: 60,
          },
        });
      }

      // Simple linear regression for predictions
      let predictions = {};

      if (prediction === 'duration') {
        const durations = deployments.map(d => d.metricsData?.totalDuration || 0);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const stdDev = Math.sqrt(
          durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length
        );
        predictions = {
          expected: avgDuration,
          min: Math.max(0, avgDuration - stdDev),
          max: avgDuration + stdDev,
          confidence: deployments.length > 10 ? 0.95 : 0.75,
        };
      } else if (prediction === 'success') {
        const successCount = deployments.filter(d => d.status === 'completed').length;
        const successRate = successCount / deployments.length;
        predictions = {
          expectedSuccessRate: successRate,
          expectedFailureRate: 1 - successRate,
          confidence: deployments.length > 10 ? 0.95 : 0.75,
        };
      } else if (prediction === 'cost') {
        const costs = deployments.map(d => d.metricsData?.estimatedCost || 0);
        const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
        const stdDev = Math.sqrt(
          costs.reduce((sum, c) => sum + Math.pow(c - avgCost, 2), 0) / costs.length
        );
        predictions = {
          expected: avgCost,
          min: Math.max(0, avgCost - stdDev),
          max: avgCost + stdDev,
          confidence: deployments.length > 10 ? 0.95 : 0.75,
        };
      }

      logger.info(`Predictions generated`, {
        userId: req.user.id,
        prediction,
        sampleSize: deployments.length,
      });

      sendSuccess(res, {
        data: {
          prediction,
          historicalDataPoints: deployments.length,
          timeRange: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days: daysNum,
          },
          predictions,
        },
      });
    } catch (error) {
      logger.error('Failed to generate predictions', error);
      sendError(res, 'Failed to generate predictions', 500, 'PREDICTION_ERROR');
    }
  })
);

/**
 * GET /api/analytics/usage
 * Get usage statistics (API calls, resource usage, user activity)
 * 
 * Query Parameters:
 * - days: Number of days to include (default: 30)
 */
router.get(
  '/usage',
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = Math.min(parseInt(days) || 30, 365);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const deployments = await Deployment.findAll({
        where: {
          userId: req.user.id,
          createdAt: { [Op.gte]: startDate },
        },
      });

      const logs = await DeploymentLog.findAll({
        where: {
          createdAt: { [Op.gte]: startDate },
        },
        include: [{
          model: Deployment,
          where: { userId: req.user.id },
          attributes: [],
        }],
      });

      const usageStats = {
        timeRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days: daysNum,
        },
        deployments: {
          total: deployments.length,
          byStatus: {
            pending: deployments.filter(d => d.status === 'pending').length,
            running: deployments.filter(d => d.status === 'running').length,
            completed: deployments.filter(d => d.status === 'completed').length,
            failed: deployments.filter(d => d.status === 'failed').length,
          },
          byProvider: deployments.reduce((acc, d) => {
            acc[d.cloudProvider] = (acc[d.cloudProvider] || 0) + 1;
            return acc;
          }, {}),
        },
        activity: {
          totalLogs: logs.length,
          logsByLevel: {
            debug: logs.filter(l => l.logLevel === 'debug').length,
            info: logs.filter(l => l.logLevel === 'info').length,
            warn: logs.filter(l => l.logLevel === 'warn').length,
            error: logs.filter(l => l.logLevel === 'error').length,
            fatal: logs.filter(l => l.logLevel === 'fatal').length,
          },
        },
        resources: {
          totalClusters: deployments.length,
          activeClusters: deployments.filter(d => d.status === 'running').length,
        },
      };

      logger.info(`Usage stats retrieved`, {
        userId: req.user.id,
        days: daysNum,
        deploymentCount: deployments.length,
      });

      sendSuccess(res, { data: usageStats });
    } catch (error) {
      logger.error('Failed to retrieve usage stats', error);
      sendError(res, 'Failed to retrieve usage stats', 500, 'USAGE_STATS_ERROR');
    }
  })
);

module.exports = router;
