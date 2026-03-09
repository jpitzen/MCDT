const { Deployment, DeploymentLog } = require('../models');
const logger = require('./logger');

/**
 * MetricsCollector Service
 * Collects and aggregates deployment metrics including duration, success rates, costs, and performance
 * Provides analytics endpoints for dashboard visualization
 */
class MetricsCollector {
  /**
   * Record deployment start
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Deployment with startTime recorded
   */
  static async recordStart(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) throw new Error('Deployment not found');

      deployment.startedAt = new Date();
      deployment.metricsData = {
        ...deployment.metricsData,
        startTime: new Date().toISOString(),
        startTimestamp: Date.now(),
      };

      await deployment.save();

      logger.info('Deployment start recorded', { deploymentId });
      return deployment;
    } catch (error) {
      logger.error('Failed to record deployment start', { deploymentId, error: error.message });
      throw error;
    }
  }

  /**
   * Record deployment completion with metrics
   * @param {string} deploymentId - Deployment ID
   * @param {object} outputs - Deployment outputs
   * @returns {Promise} Computed metrics
   */
  static async recordCompletion(deploymentId, outputs = {}) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) throw new Error('Deployment not found');

      const completionTime = new Date();
      const startTime = deployment.startedAt || deployment.createdAt;
      const duration = Math.round((completionTime - startTime) / 1000); // Duration in seconds

      deployment.completedAt = completionTime;
      deployment.metricsData = {
        ...deployment.metricsData,
        endTime: completionTime.toISOString(),
        endTimestamp: Date.now(),
        duration, // Total duration in seconds
        durationMinutes: (duration / 60).toFixed(2),
        success: true,
      };

      await deployment.save();

      logger.info('Deployment completion recorded', {
        deploymentId,
        duration: `${duration}s`,
      });

      return this.computeDeploymentMetrics(deployment);
    } catch (error) {
      logger.error('Failed to record deployment completion', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Record deployment failure with metrics
   * @param {string} deploymentId - Deployment ID
   * @param {string} errorMessage - Error message
   * @returns {Promise} Computed metrics
   */
  static async recordFailure(deploymentId, errorMessage) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) throw new Error('Deployment not found');

      const failureTime = new Date();
      const startTime = deployment.startedAt || deployment.createdAt;
      const duration = Math.round((failureTime - startTime) / 1000);

      deployment.completedAt = failureTime;
      deployment.metricsData = {
        ...deployment.metricsData,
        endTime: failureTime.toISOString(),
        endTimestamp: Date.now(),
        duration,
        durationMinutes: (duration / 60).toFixed(2),
        success: false,
        failureReason: errorMessage,
      };

      await deployment.save();

      logger.info('Deployment failure recorded', {
        deploymentId,
        duration: `${duration}s`,
        reason: errorMessage,
      });

      return this.computeDeploymentMetrics(deployment);
    } catch (error) {
      logger.error('Failed to record deployment failure', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Record phase transition with timing
   * @param {string} deploymentId - Deployment ID
   * @param {string} phaseName - Phase name
   * @returns {Promise} Updated deployment
   */
  static async recordPhaseTransition(deploymentId, phaseName) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) throw new Error('Deployment not found');

      const phaseTimings = deployment.metricsData?.phaseTimings || {};
      phaseTimings[phaseName] = {
        enteredAt: new Date().toISOString(),
        timestamp: Date.now(),
      };

      deployment.metricsData = {
        ...deployment.metricsData,
        phaseTimings,
        currentPhase: phaseName,
      };

      await deployment.save();

      logger.debug('Phase transition recorded', { deploymentId, phaseName });
      return deployment;
    } catch (error) {
      logger.error('Failed to record phase transition', {
        deploymentId,
        phaseName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compute detailed metrics for a deployment
   * @param {object} deployment - Deployment object
   * @returns {object} Computed metrics
   */
  static computeDeploymentMetrics(deployment) {
    const metrics = {
      deploymentId: deployment.id,
      cloudProvider: deployment.cloudProvider,
      status: deployment.status,
      success: deployment.metricsData?.success || false,
      startTime: deployment.startedAt,
      endTime: deployment.completedAt,
      duration: deployment.metricsData?.duration || 0,
      durationMinutes: deployment.metricsData?.durationMinutes || 0,
      clusterSize: deployment.clusterSize,
      nodeCount: deployment.nodeCount,
      metricsData: deployment.metricsData,
    };

    return metrics;
  }

  /**
   * Get aggregate metrics for all deployments
   * @param {object} options - Filter options (cloudProvider, status, dateRange)
   * @returns {Promise} Aggregated metrics
   */
  static async getAggregateMetrics(options = {}) {
    try {
      const { cloudProvider, status, startDate, endDate } = options;

      const where = {};
      if (cloudProvider) where.cloudProvider = cloudProvider;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[require('sequelize').Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[require('sequelize').Op.lte] = new Date(endDate);
      }

      const deployments = await Deployment.findAll({
        where,
        attributes: [
          'id',
          'cloudProvider',
          'status',
          'startedAt',
          'completedAt',
          'createdAt',
          'metricsData',
        ],
        raw: true,
      });

      return this._calculateAggregateStats(deployments, options);
    } catch (error) {
      logger.error('Failed to get aggregate metrics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate aggregate statistics
   * @private
   */
  static _calculateAggregateStats(deployments, options) {
    const stats = {
      totalDeployments: deployments.length,
      successfulDeployments: 0,
      failedDeployments: 0,
      successRate: 0,
      averageDuration: 0,
      medianDuration: 0,
      minDuration: null,
      maxDuration: null,
      byCloudProvider: {},
      byStatus: {},
      timeline: {},
    };

    if (deployments.length === 0) {
      return stats;
    }

    const durations = [];
    deployments.forEach((deployment) => {
      // Success/failure counts
      if (deployment.status === 'completed' && deployment.metricsData?.success) {
        stats.successfulDeployments++;
      } else if (deployment.status === 'failed') {
        stats.failedDeployments++;
      }

      // Duration tracking
      if (deployment.metricsData?.duration) {
        durations.push(deployment.metricsData.duration);
      }

      // Group by cloud provider
      const provider = deployment.cloudProvider || 'unknown';
      if (!stats.byCloudProvider[provider]) {
        stats.byCloudProvider[provider] = { count: 0, successful: 0 };
      }
      stats.byCloudProvider[provider].count++;
      if (deployment.metricsData?.success) {
        stats.byCloudProvider[provider].successful++;
      }

      // Group by status
      const stat = deployment.status || 'unknown';
      stats.byStatus[stat] = (stats.byStatus[stat] || 0) + 1;
    });

    // Calculate duration stats
    if (durations.length > 0) {
      stats.averageDuration = Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length
      );
      stats.minDuration = Math.min(...durations);
      stats.maxDuration = Math.max(...durations);

      // Calculate median
      const sorted = durations.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.medianDuration =
        sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Calculate success rate
    stats.successRate =
      stats.totalDeployments > 0
        ? ((stats.successfulDeployments / stats.totalDeployments) * 100).toFixed(2)
        : 0;

    logger.debug('Aggregate metrics calculated', {
      totalDeployments: stats.totalDeployments,
      successRate: stats.successRate,
    });

    return stats;
  }

  /**
   * Get deployment trends over time
   * @param {object} options - Filter options
   * @returns {Promise} Trend data
   */
  static async getDeploymentTrends(options = {}) {
    try {
      const { days = 30, cloudProvider } = options;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        createdAt: {
          [require('sequelize').Op.gte]: startDate,
        },
      };

      if (cloudProvider) {
        where.cloudProvider = cloudProvider;
      }

      const deployments = await Deployment.findAll({
        where,
        attributes: ['createdAt', 'status', 'cloudProvider', 'metricsData'],
        raw: true,
      });

      return this._aggregateTrendsByDate(deployments);
    } catch (error) {
      logger.error('Failed to get deployment trends', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Aggregate trends by date
   * @private
   */
  static _aggregateTrendsByDate(deployments) {
    const trends = {};

    deployments.forEach((deployment) => {
      const dateKey = new Date(deployment.createdAt).toISOString().split('T')[0];

      if (!trends[dateKey]) {
        trends[dateKey] = {
          date: dateKey,
          total: 0,
          successful: 0,
          failed: 0,
          byProvider: {},
        };
      }

      trends[dateKey].total++;

      if (deployment.status === 'completed' && deployment.metricsData?.success) {
        trends[dateKey].successful++;
      } else if (deployment.status === 'failed') {
        trends[dateKey].failed++;
      }

      const provider = deployment.cloudProvider || 'unknown';
      trends[dateKey].byProvider[provider] =
        (trends[dateKey].byProvider[provider] || 0) + 1;
    });

    return Object.values(trends).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
  }

  /**
   * Get performance metrics for a specific deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Performance metrics
   */
  static async getPerformanceMetrics(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) throw new Error('Deployment not found');

      const logs = await DeploymentLog.findAll({
        where: { deploymentId },
        raw: true,
      });

      return {
        deploymentId,
        totalLogs: logs.length,
        errorLogs: logs.filter((l) => ['error', 'fatal'].includes(l.logLevel))
          .length,
        warningLogs: logs.filter((l) => l.logLevel === 'warn').length,
        infeLogs: logs.filter((l) => l.logLevel === 'info').length,
        metrics: this.computeDeploymentMetrics(deployment),
        phaseMetrics: this._computePhaseMetrics(deployment),
      };
    } catch (error) {
      logger.error('Failed to get performance metrics', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compute phase-specific metrics
   * @private
   */
  static _computePhaseMetrics(deployment) {
    const phaseTimings = deployment.metricsData?.phaseTimings || {};
    const phaseMetrics = {};

    Object.entries(phaseTimings).forEach(([phase, timing]) => {
      phaseMetrics[phase] = {
        enteredAt: timing.enteredAt,
        timestamp: timing.timestamp,
      };
    });

    return phaseMetrics;
  }

  /**
   * Get cost analysis for deployments
   * @param {object} options - Filter options
   * @returns {Promise} Cost analysis
   */
  static async getCostAnalysis(options = {}) {
    try {
      const { cloudProvider, startDate, endDate } = options;

      const where = {};
      if (cloudProvider) where.cloudProvider = cloudProvider;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[require('sequelize').Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[require('sequelize').Op.lte] = new Date(endDate);
      }

      const deployments = await Deployment.findAll({
        where,
        attributes: ['id', 'cloudProvider', 'clusterSize', 'nodeCount', 'metricsData'],
        raw: true,
      });

      return this._calculateCostMetrics(deployments);
    } catch (error) {
      logger.error('Failed to get cost analysis', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate cost metrics
   * @private
   */
  static _calculateCostMetrics(deployments) {
    const costMetrics = {
      totalDeployments: deployments.length,
      byProvider: {},
      estimatedTotalCost: 0,
    };

    // Simplified cost estimation (would be replaced with actual cost API calls)
    const costPerNode = {
      aws: 0.0116, // Per hour
      azure: 0.0123,
      gcp: 0.0129,
      alibaba: 0.0095,
      digitalocean: 0.01488,
    };

    deployments.forEach((deployment) => {
      const provider = deployment.cloudProvider || 'unknown';
      const nodeCount = deployment.nodeCount || 1;
      const duration = deployment.metricsData?.duration || 0;
      const hours = duration / 3600;

      const cost = (costPerNode[provider] || 0.01) * nodeCount * hours;

      if (!costMetrics.byProvider[provider]) {
        costMetrics.byProvider[provider] = {
          count: 0,
          estimatedCost: 0,
        };
      }

      costMetrics.byProvider[provider].count++;
      costMetrics.byProvider[provider].estimatedCost += cost;
      costMetrics.estimatedTotalCost += cost;
    });

    costMetrics.estimatedTotalCost = parseFloat(
      costMetrics.estimatedTotalCost.toFixed(2)
    );

    return costMetrics;
  }

  /**
   * Calculate aggregate metrics from deployment array (used by analytics routes)
   * @param {Array} deployments - Array of deployment objects
   * @returns {Object} Calculated metrics
   */
  static calculateAggregateMetrics(deployments) {
    return this._calculateAggregateStats(deployments, {});
  }

  /**
   * Calculate trends from deployment array (used by analytics routes)
   * @param {Array} deployments - Array of deployment objects
   * @param {string} metric - Metric type (success, duration, cost)
   * @param {string} interval - Interval (daily, weekly, monthly)
   * @param {number} days - Number of days
   * @returns {Array} Trend data points
   */
  static calculateTrends(deployments, metric = 'success', interval = 'daily', days = 30) {
    const trends = [];
    const now = new Date();
    const intervalMs = interval === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 
                      interval === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 
                      24 * 60 * 60 * 1000; // daily

    // Group deployments by interval
    const buckets = {};
    deployments.forEach((deployment) => {
      const date = new Date(deployment.createdAt);
      const bucketKey = Math.floor(date.getTime() / intervalMs) * intervalMs;
      
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = {
          timestamp: bucketKey,
          deployments: [],
          successCount: 0,
          failureCount: 0,
          totalDuration: 0,
          count: 0,
        };
      }
      
      buckets[bucketKey].deployments.push(deployment);
      buckets[bucketKey].count++;
      
      if (deployment.status === 'completed') {
        buckets[bucketKey].successCount++;
      } else if (deployment.status === 'failed') {
        buckets[bucketKey].failureCount++;
      }
      
      if (deployment.metricsData?.duration) {
        buckets[bucketKey].totalDuration += deployment.metricsData.duration;
      }
    });

    // Convert buckets to trend data
    Object.keys(buckets).sort().forEach((key) => {
      const bucket = buckets[key];
      let value;
      
      switch (metric) {
        case 'success':
          value = bucket.count > 0 ? (bucket.successCount / bucket.count) * 100 : 0;
          break;
        case 'duration':
          value = bucket.count > 0 ? bucket.totalDuration / bucket.count : 0;
          break;
        case 'cost':
          value = 0; // Simplified
          break;
        default:
          value = bucket.count;
      }
      
      trends.push({
        timestamp: new Date(parseInt(key)),
        date: new Date(parseInt(key)).toISOString(),
        value: parseFloat(value.toFixed(2)),
        count: bucket.count,
      });
    });

    return trends;
  }
}

module.exports = MetricsCollector;
