const { DeploymentLog } = require('../models');
const logger = require('./logger');

/**
 * LogService
 * Manages deployment log operations including storage, retrieval, and export
 * Integrates with WebSocket emission for real-time updates
 */
class LogService {
  /**
   * Add a log entry for a deployment
   * @param {string} deploymentId - Deployment ID
   * @param {object} logData - Log data
   * @returns {Promise} Created log entry
   */
  static async addLog(deploymentId, logData) {
    try {
      const {
        logLevel = 'info',
        message,
        logType,
        data = {},
        source = 'system',
        metadata = {},
        stackTrace = null,
      } = logData;

      if (!deploymentId || !message || !logType) {
        throw new Error('Missing required fields: deploymentId, message, logType');
      }

      const log = await DeploymentLog.createLog({
        deploymentId,
        logLevel,
        message,
        logType,
        data,
        source,
        metadata,
        stackTrace,
      });

      logger.info('Log entry created', {
        logId: log.id,
        deploymentId,
        logLevel,
        logType,
      });

      return log;
    } catch (error) {
      logger.error('Failed to add log entry', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get logs for a deployment with filtering and pagination
   * @param {string} deploymentId - Deployment ID
   * @param {object} options - Query options (limit, offset, logLevel, logType, startDate, endDate)
   * @returns {Promise} Logs and pagination info
   */
  static async getLogs(deploymentId, options = {}) {
    try {
      if (!deploymentId) {
        throw new Error('deploymentId is required');
      }

      const logs = await DeploymentLog.getLogs(deploymentId, options);

      logger.debug('Retrieved deployment logs', {
        deploymentId,
        count: logs.logs.length,
        total: logs.total,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to retrieve logs', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all logs for a deployment (unbounded)
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} All logs
   */
  static async getAllLogs(deploymentId) {
    try {
      const logs = await DeploymentLog.getLogs(deploymentId, {
        limit: 10000, // Large limit for all logs
        offset: 0,
      });

      return logs.logs;
    } catch (error) {
      logger.error('Failed to retrieve all logs', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search logs by message content
   * @param {string} deploymentId - Deployment ID
   * @param {string} searchText - Search query
   * @returns {Promise} Search results
   */
  static async searchLogs(deploymentId, searchText) {
    try {
      if (!deploymentId || !searchText) {
        throw new Error('deploymentId and searchText are required');
      }

      const results = await DeploymentLog.search(deploymentId, searchText);

      logger.info('Log search completed', {
        deploymentId,
        searchText,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to search logs', {
        deploymentId,
        searchText,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get log statistics for a deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Statistics
   */
  static async getStatistics(deploymentId) {
    try {
      const stats = await DeploymentLog.getStatistics(deploymentId);

      logger.debug('Retrieved log statistics', {
        deploymentId,
        stats,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get log statistics', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get logs by type
   * @param {string} deploymentId - Deployment ID
   * @param {string} logType - Log type
   * @returns {Promise} Filtered logs
   */
  static async getLogsByType(deploymentId, logType) {
    try {
      const logs = await DeploymentLog.getByType(deploymentId, logType);

      logger.debug('Retrieved logs by type', {
        deploymentId,
        logType,
        count: logs.length,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get logs by type', {
        deploymentId,
        logType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get deployment log timeline (aggregated by minute)
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Timeline data
   */
  static async getTimeline(deploymentId) {
    try {
      const timeline = await DeploymentLog.getTimeline(deploymentId);

      logger.debug('Retrieved log timeline', {
        deploymentId,
        dataPoints: timeline.length,
      });

      return timeline;
    } catch (error) {
      logger.error('Failed to get log timeline', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export logs to JSON
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Exported logs
   */
  static async exportLogs(deploymentId) {
    try {
      const exported = await DeploymentLog.exportLogs(deploymentId);

      logger.info('Logs exported', {
        deploymentId,
        logCount: exported.logCount,
      });

      return exported;
    } catch (error) {
      logger.error('Failed to export logs', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete expired logs (older than 30 days)
   * @returns {Promise} Number of deleted logs
   */
  static async deleteExpiredLogs() {
    try {
      const deleted = await DeploymentLog.deleteExpired();

      logger.info('Expired logs deleted', {
        count: deleted,
      });

      return deleted;
    } catch (error) {
      logger.error('Failed to delete expired logs', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get error summary for a deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Error summary
   */
  static async getErrorSummary(deploymentId) {
    try {
      const errorLogs = await DeploymentLog.findAll({
        where: {
          deploymentId,
          logLevel: {
            [require('sequelize').Op.in]: ['error', 'fatal'],
          },
        },
        attributes: ['id', 'message', 'logType', 'createdAt', 'stackTrace'],
        order: [['createdAt', 'DESC']],
        raw: true,
      });

      logger.debug('Retrieved error summary', {
        deploymentId,
        errorCount: errorLogs.length,
      });

      return {
        deploymentId,
        errorCount: errorLogs.length,
        errors: errorLogs,
        summary: this._summarizeErrors(errorLogs),
      };
    } catch (error) {
      logger.error('Failed to get error summary', {
        deploymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create summary of errors (group by type)
   * @private
   */
  static _summarizeErrors(errors) {
    const summary = {};
    errors.forEach((error) => {
      const type = error.logType || 'unknown';
      if (!summary[type]) {
        summary[type] = 0;
      }
      summary[type]++;
    });
    return summary;
  }

  /**
   * Get logs between deployment phases
   * @param {string} deploymentId - Deployment ID
   * @param {string} fromPhase - Starting phase
   * @param {string} toPhase - Ending phase
   * @returns {Promise} Logs for phase range
   */
  static async getLogsBetweenPhases(deploymentId, fromPhase, toPhase) {
    try {
      // Find logs for phase transitions
      const logs = await DeploymentLog.findAll({
        where: {
          deploymentId,
          logType: {
            [require('sequelize').Op.in]: [
              `${fromPhase}-complete`,
              `${toPhase}-start`,
              'phase-transition',
            ],
          },
        },
        order: [['createdAt', 'ASC']],
        raw: true,
      });

      logger.debug('Retrieved logs between phases', {
        deploymentId,
        fromPhase,
        toPhase,
        logCount: logs.length,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get logs between phases', {
        deploymentId,
        fromPhase,
        toPhase,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up old logs periodically (should be called by scheduler)
   * @returns {Promise} Cleanup result
   */
  static async performMaintenanceCleanup() {
    try {
      logger.info('Starting log maintenance cleanup');

      const deleted = await this.deleteExpiredLogs();

      logger.info('Log maintenance cleanup completed', {
        deletedCount: deleted,
      });

      return {
        success: true,
        deletedCount: deleted,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Log maintenance cleanup failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = LogService;
