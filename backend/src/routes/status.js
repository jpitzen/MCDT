const express = require('express');
const { sequelize } = require('../models');
const { Deployment, Credential, User } = require('../models');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../services');

const router = express.Router();

/**
 * GET /api/status
 * Get overall system status with actual database queries
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    
    // Get deployment statistics
    const [activeDeployments, pendingDeployments, completedDeployments, failedDeployments] = await Promise.all([
      Deployment.count({ where: { status: 'running' } }),
      Deployment.count({ where: { status: 'pending' } }),
      Deployment.count({ where: { status: 'completed' } }),
      Deployment.count({ where: { status: 'failed' } })
    ]);

    // Get total deployments and clusters
    const totalDeployments = await Deployment.count();
    const uniqueClusters = await Deployment.count({
      distinct: true,
      col: 'clusterName'
    });

    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'connected',
        api: 'operational'
      },
      deployments: {
        active: activeDeployments,
        pending: pendingDeployments,
        completed: completedDeployments,
        failed: failedDeployments,
        total: totalDeployments
      },
      clusters: {
        total: uniqueClusters,
        totalNodes: 0 // Would need cluster monitoring integration
      }
    });
  } catch (error) {
    logger.error('Status check error', error);
    sendError(res, 'Failed to get status', 500, 'STATUS_ERROR');
  }
}));

/**
 * GET /api/status/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
  try {
    const [
      totalUsers,
      totalCredentials,
      totalDeployments,
      activeDeployments,
      failedDeployments,
      recentDeployments
    ] = await Promise.all([
      User.count(),
      Credential.count({ where: { userId: req.user.id } }),
      Deployment.count({ where: { userId: req.user.id } }),
      Deployment.count({ where: { userId: req.user.id, status: 'running' } }),
      Deployment.count({ where: { userId: req.user.id, status: 'failed' } }),
      Deployment.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'clusterName', 'status', 'cloudProvider', 'configuration', 'createdAt', 'updatedAt']
      })
    ]);

    sendSuccess(res, {
      statistics: {
        totalDeployments,
        activeDeployments,
        failedDeployments,
        totalCredentials,
        successRate: totalDeployments > 0 
          ? ((totalDeployments - failedDeployments) / totalDeployments * 100).toFixed(2)
          : 0
      },
      recentActivity: recentDeployments,
      systemInfo: {
        totalUsers,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error', error);
    sendError(res, 'Failed to get dashboard data', 500, 'DASHBOARD_ERROR');
  }
}));

/**
 * GET /api/status/services
 * Get service health
 */
router.get('/services', authenticate, asyncHandler(async (req, res) => {
  const services = [];
  
  // Check database
  try {
    const start = Date.now();
    await sequelize.authenticate();
    services.push({
      name: 'Database',
      status: 'healthy',
      latency: `${Date.now() - start}ms`
    });
  } catch (error) {
    services.push({
      name: 'Database',
      status: 'unhealthy',
      error: error.message
    });
  }

  // Add API status
  services.push({
    name: 'API Server',
    status: 'healthy',
    version: '1.0.0'
  });

  sendSuccess(res, { services });
}));

module.exports = router;
