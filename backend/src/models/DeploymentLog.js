const { DataTypes } = require('sequelize');

/**
 * DeploymentLog Model
 * Stores all logs for deployments with efficient querying and filtering
 * 
 * Features:
 * - Persistent storage of all deployment logs
 * - 30-day retention policy
 * - Indexed for fast retrieval
 * - Log level filtering
 * - Timestamp-based pagination
 */
module.exports = (sequelize) => {
  const DeploymentLog = sequelize.define('DeploymentLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deploymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true, // Index for fast deployment-based queries
      references: {
        model: 'Deployments',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    logLevel: {
      type: DataTypes.ENUM('debug', 'info', 'warn', 'error', 'fatal'),
      defaultValue: 'info',
      index: true, // Index for filtering by level
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    logType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // Types: 'deployment-start', 'terraform-init', 'terraform-plan', 'terraform-apply',
      //        'phase-complete', 'error', 'warning', 'deployment-complete', etc.
      index: true,
    },
    data: {
      type: DataTypes.JSONB, // PostgreSQL JSONB for efficient queries
      defaultValue: {},
      // Can store: { phase, progress, error_details, terraform_output, etc. }
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'system',
      // Types: 'terraform', 'api', 'system', 'websocket', etc.
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // Additional context: { userId, ipAddress, requestId, etc. }
    },
    stackTrace: {
      type: DataTypes.TEXT,
      allowNull: true,
      // Stored only for errors
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      index: true, // Index for timestamp-based queries
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      // Set to createdAt + 30 days for TTL-like behavior
      index: true,
    },
  }, {
    tableName: 'deployment_logs',
    timestamps: true, // Includes createdAt, updatedAt
    paranoid: false, // Don't use soft deletes for logs
    indexes: [
      // Composite indexes for common query patterns
      {
        fields: ['deploymentId', 'createdAt'],
        name: 'idx_deployment_logs_deployment_created',
      },
      {
        fields: ['deploymentId', 'logLevel'],
        name: 'idx_deployment_logs_deployment_level',
      },
      {
        fields: ['logLevel', 'createdAt'],
        name: 'idx_deployment_logs_level_created',
      },
      {
        fields: ['expiresAt'],
        name: 'idx_deployment_logs_expires',
      },
    ],
  });

  /**
   * Get logs for a deployment with filtering and pagination
   * @param {string} deploymentId - Deployment ID
   * @param {object} options - Query options
   * @returns {Promise} Logs and pagination info
   */
  DeploymentLog.getLogs = async (deploymentId, options = {}) => {
    const {
      limit = 50,
      offset = 0,
      logLevel,
      logType,
      startDate,
      endDate,
      orderBy = 'DESC',
    } = options;

    const where = { deploymentId };

    // Filter by log level
    if (logLevel) {
      where.logLevel = logLevel;
    }

    // Filter by log type
    if (logType) {
      where.logType = logType;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[DataTypes.Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[DataTypes.Op.lte] = new Date(endDate);
    }

    const { count, rows } = await DeploymentLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', orderBy]],
      raw: true,
    });

    return {
      logs: rows,
      total: count,
      limit,
      offset,
      hasMore: offset + limit < count,
    };
  };

  /**
   * Get log summary statistics for a deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Log statistics
   */
  DeploymentLog.getStatistics = async (deploymentId) => {
    const stats = await DeploymentLog.sequelize.query(`
      SELECT 
        "logLevel",
        COUNT(*) as count,
        MIN("createdAt") as first_log,
        MAX("createdAt") as last_log
      FROM deployment_logs
      WHERE "deploymentId" = :deploymentId
      GROUP BY "logLevel"
    `, {
      replacements: { deploymentId },
      type: DataTypes.QueryTypes.SELECT,
    });

    return stats;
  };

  /**
   * Get logs by log type for a deployment
   * @param {string} deploymentId - Deployment ID
   * @param {string} logType - Log type to filter
   * @returns {Promise} Filtered logs
   */
  DeploymentLog.getByType = async (deploymentId, logType) => {
    return await DeploymentLog.findAll({
      where: {
        deploymentId,
        logType,
      },
      order: [['createdAt', 'ASC']],
      raw: true,
    });
  };

  /**
   * Search logs with full-text search
   * @param {string} deploymentId - Deployment ID
   * @param {string} searchText - Search query
   * @returns {Promise} Search results
   */
  DeploymentLog.search = async (deploymentId, searchText) => {
    return await DeploymentLog.findAll({
      where: {
        deploymentId,
        message: {
          [DataTypes.Op.iLike]: `%${searchText}%`,
        },
      },
      order: [['createdAt', 'DESC']],
      limit: 100,
      raw: true,
    });
  };

  /**
   * Create a new log entry
   * @param {object} logData - Log data
   * @returns {Promise} Created log
   */
  DeploymentLog.createLog = async (logData) => {
    const {
      deploymentId,
      logLevel = 'info',
      message,
      logType,
      data = {},
      source = 'system',
      metadata = {},
      stackTrace = null,
    } = logData;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day retention

    return await DeploymentLog.create({
      deploymentId,
      logLevel,
      message,
      logType,
      data,
      source,
      metadata,
      stackTrace,
      expiresAt,
    });
  };

  /**
   * Delete expired logs (older than retention period)
   * @returns {Promise} Number of deleted logs
   */
  DeploymentLog.deleteExpired = async () => {
    return await DeploymentLog.destroy({
      where: {
        expiresAt: {
          [DataTypes.Op.lt]: new Date(),
        },
      },
    });
  };

  /**
   * Export logs to JSON format
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} JSON logs
   */
  DeploymentLog.exportLogs = async (deploymentId) => {
    const logs = await DeploymentLog.findAll({
      where: { deploymentId },
      order: [['createdAt', 'ASC']],
      raw: true,
    });

    return {
      deploymentId,
      exportedAt: new Date(),
      logCount: logs.length,
      logs,
    };
  };

  /**
   * Get deployment log timeline (aggregated by time)
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise} Timeline data
   */
  DeploymentLog.getTimeline = async (deploymentId) => {
    return await DeploymentLog.sequelize.query(`
      SELECT 
        DATE_TRUNC('minute', "createdAt") as minute,
        "logLevel",
        COUNT(*) as count
      FROM deployment_logs
      WHERE "deploymentId" = :deploymentId
      GROUP BY DATE_TRUNC('minute', "createdAt"), "logLevel"
      ORDER BY minute ASC
    `, {
      replacements: { deploymentId },
      type: DataTypes.QueryTypes.SELECT,
    });
  };

  return DeploymentLog;
};
